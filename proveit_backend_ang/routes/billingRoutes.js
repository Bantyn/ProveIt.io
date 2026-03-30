const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../config/firebase');

// ── Razorpay SDK ────────────────────────────────────────────────────────────
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

// ── GET subscription by company ID ──────────────────────────────────────────
router.get('/subscription/company/:companyId', async (req, res) => {
    try {
        const companyId = req.params.companyId;
        const snapshot = await db.collection('subscriptions')
            .where('companyId', '==', companyId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(200).json(null);
        }

        const doc = snapshot.docs[0];
        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── GET payments by company ID ──────────────────────────────────────────────
router.get('/payments/company/:companyId', async (req, res) => {
    try {
        const companyId = req.params.companyId;
        const snapshot = await db.collection('payments')
            .where('companyId', '==', companyId)
            .get();

        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        let payments = [];
        snapshot.forEach(doc => {
            payments.push({ id: doc.id, ...doc.data() });
        });
        // Sort by createdAt descending in JS (avoids needing a composite index)
        payments.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
        res.status(200).json(payments);
    } catch (error) {
        console.error('Error fetching company payments:', error);
        res.status(500).json({ error: error.message });
    }
});

// ── POST /create-order — Create a Razorpay order ───────────────────────────
router.post('/create-order', async (req, res) => {
    try {
        const { amount, planName, companyId, companyName } = req.body;

        if (!amount || !planName || !companyId) {
            return res.status(400).json({ error: 'amount, planName, and companyId are required' });
        }

        // Amount must be in paise (INR smallest unit)
        const amountInPaise = Math.round(amount * 100);

        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_${companyId}_${Date.now()}`,
            notes: {
                planName,
                companyId,
                companyName: companyName || 'Company',
            },
        };

        const order = await razorpay.orders.create(options);

        res.status(200).json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error('Razorpay create-order error:', error);
        res.status(500).json({ error: error.message || 'Failed to create Razorpay order' });
    }
});

// ── POST /verify-payment — Verify Razorpay payment signature ────────────────
router.post('/verify-payment', async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            companyId,
            planName,
            amount,
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing Razorpay payment details' });
        }

        if (!companyId || !planName) {
            return res.status(400).json({ error: 'Missing companyId or planName' });
        }

        // 1. Verify signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Payment verification failed — invalid signature' });
        }

        // 2. Fetch payment method + company data in parallel
        let paymentMethod = 'Razorpay';
        const [paymentDetails, companyDoc, existingSub] = await Promise.all([
            razorpay.payments.fetch(razorpay_payment_id).catch(() => null),
            db.collection('companies').doc(companyId).get(),
            db.collection('subscriptions')
                .where('companyId', '==', companyId)
                .limit(1)
                .get(),
        ]);

        if (paymentDetails?.method) {
            paymentMethod = paymentDetails.method;
        }

        const companyData = companyDoc.exists ? companyDoc.data() : {};

        // 3. BATCHED WRITE — All mutations in a single atomic operation
        const batch = db.batch();
        const now = new Date().toISOString();

        // Update company plan
        const companyRef = db.collection('companies').doc(companyId);
        batch.update(companyRef, {
            plan: planName,
            subscriptionId: `sub_rzp_${razorpay_payment_id}`,
            updatedAt: now,
        });

        // Create Payment record
        const paymentRef = db.collection('payments').doc();
        batch.set(paymentRef, {
            companyId,
            companyName: companyData.name || companyData.companyName || 'Company',
            amount: amount || 0,
            plan: planName,
            status: 'success',
            method: paymentMethod.toUpperCase(),
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            transactionId: razorpay_payment_id,
            description: `Plan Upgrade to ${planName}`,
            createdAt: now,
        });

        // Create/Update Subscription
        const subData = {
            companyId,
            plan: planName,
            status: 'ACTIVE',
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            validFrom: now,
            validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: now,
        };

        if (existingSub.empty) {
            const subRef = db.collection('subscriptions').doc();
            batch.set(subRef, subData);
        } else {
            const subRef = db.collection('subscriptions').doc(existingSub.docs[0].id);
            batch.update(subRef, subData);
        }

        // Activity Log
        const logRef = db.collection('activityLogs').doc();
        batch.set(logRef, {
            action: 'PLAN_UPGRADE',
            severity: 'SUCCESS',
            description: `${companyData.name || 'A company'} upgraded to ${planName} plan via Razorpay. Payment ID: ${razorpay_payment_id}. Revenue: ₹${amount}`,
            createdAt: now,
        });

        // Commit all writes atomically
        await batch.commit();

        res.status(200).json({
            message: 'Payment verified and plan upgraded successfully!',
            newPlan: planName,
            paymentId: razorpay_payment_id,
        });
    } catch (error) {
        console.error('Razorpay verify-payment error:', error);
        res.status(500).json({ error: error.message || 'Payment verification failed' });
    }
});

// ── POST /razorpay-webhook — Webhook handler for Razorpay events ────────────
router.post('/razorpay-webhook', async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || '';
        const receivedSignature = req.headers['x-razorpay-signature'];

        // Verify webhook signature
        if (receivedSignature && webhookSecret) {
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(JSON.stringify(req.body))
                .digest('hex');

            if (expectedSignature !== receivedSignature) {
                console.warn('Razorpay webhook: Invalid signature');
                return res.status(400).json({ error: 'Invalid webhook signature' });
            }
        }

        const event = req.body.event;
        const payload = req.body.payload;

        if (event === 'payment.captured') {
            const payment = payload.payment.entity;
            const orderId = payment.order_id;
            const paymentId = payment.id;

            console.log(`Razorpay Webhook: payment.captured — Order: ${orderId}, Payment: ${paymentId}`);

            // Log the webhook event
            await db.collection('activityLogs').add({
                action: 'RAZORPAY_WEBHOOK',
                severity: 'INFO',
                description: `Webhook: payment.captured for order ${orderId}. Amount: ₹${payment.amount / 100}`,
                createdAt: new Date().toISOString(),
            });
        }

        // Always acknowledge webhook
        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('Razorpay webhook error:', error);
        res.status(200).json({ status: 'ok' }); // Always 200 for webhooks
    }
});

module.exports = router;
