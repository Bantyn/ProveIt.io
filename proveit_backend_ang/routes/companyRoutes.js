const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // Standardized SMTP
    auth: {
        user: process.env.EMAIL_USER || 'no-reply@proveit.io',
        pass: process.env.EMAIL_PASS || 'default-password-change-me'
    }
});

// Get all companies (Standard HTTP)
router.get('/', async (req, res) => {
    try {
        const companiesRef = db.collection('companies');
        const snapshot = await companiesRef.get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }
        let companies = [];
        snapshot.forEach(doc => {
            companies.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).json(companies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stream all companies (Server-Sent Events)
router.get('/stream', (req, res) => {
    // 1. Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    // 2. Attach Firestore snapshot listener
    const unsubscribe = db.collection('companies').onSnapshot((snapshot) => {
        let companies = [];
        snapshot.forEach(doc => {
            companies.push({ id: doc.id, ...doc.data() });
        });

        // 3. Send data to client
        res.write(`data: ${JSON.stringify(companies)}\n\n`);
    }, (error) => {
        console.error("SSE Firebase Error:", error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    });

    // 4. Handle client disconnect
    req.on('close', () => {
        console.log('Client closed company SSE connection');
        unsubscribe(); // Detach listener
    });
});


// Get company by Owner ID
router.get('/owner/:ownerId', async (req, res) => {
    try {
        const ownerId = req.params.ownerId;
        const snapshot = await db.collection('companies')
            .where('ownerId', '==', ownerId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ error: 'Company not found for this owner' });
        }

        const doc = snapshot.docs[0];
        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── GET reviews for a company ────────────────────────────────────────────────
router.get('/:id/reviews', async (req, res) => {
    try {
        const companyId = req.params.id;
        const snapshot = await db.collection('companies').doc(companyId)
            .collection('reviews')
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) return res.status(200).json([]);

        const reviews = [];
        snapshot.forEach(doc => reviews.push({ id: doc.id, ...doc.data() }));
        res.status(200).json(reviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── POST a new review ─────────────────────────────────────────────────────────
router.post('/:id/reviews', async (req, res) => {
    try {
        const companyId = req.params.id;
        const { authorId, authorName, rating, comment } = req.body;

        if (!authorId || !rating) {
            return res.status(400).json({ error: 'authorId and rating are required' });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        const companyRef = db.collection('companies').doc(companyId);
        const reviewsRef = companyRef.collection('reviews');

        // Enforce one review per user
        const existing = await reviewsRef.where('authorId', '==', authorId).limit(1).get();
        if (!existing.empty) {
            return res.status(409).json({ error: 'You have already reviewed this company' });
        }

        // Add the review
        const review = {
            authorId,
            authorName: authorName || 'Anonymous',
            rating: Number(rating),
            comment: comment || '',
            createdAt: new Date().toISOString()
        };
        const docRef = await reviewsRef.add(review);

        // Recalculate average on the company doc
        const allReviewsSnap = await reviewsRef.get();
        const total = allReviewsSnap.size;
        let sum = 0;
        allReviewsSnap.forEach(d => { sum += (d.data().rating || 0); });
        const avg = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

        await companyRef.update({ averageRating: avg, reviewCount: total });

        res.status(201).json({ id: docRef.id, ...review, averageRating: avg, reviewCount: total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get company by ID
router.get('/:id', async (req, res) => {
    try {
        const companyRef = db.collection('companies').doc(req.params.id);
        const doc = await companyRef.get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Company not found' });
        }
        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get company dashboard data
router.get('/:id/dashboard', async (req, res) => {
    try {
        const companyId = req.params.id;

        // 1. Get recent competitions for this company
        const compsSnapshot = await db.collection('competitions')
            .where('companyId', '==', companyId)
            .get();

        let competitions = [];
        let activeCompetitions = 0;
        let competitionIds = [];

        if (!compsSnapshot.empty) {
            compsSnapshot.forEach(doc => {
                const comp = { id: doc.id, ...doc.data() };
                competitions.push(comp);
                competitionIds.push(doc.id);
                if (comp.status && comp.status.toLowerCase() !== 'closed') {
                    activeCompetitions++;
                }
            });
        }

        // Sort competitions by postedAt desc
        competitions.sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0));

        // 2. Get applications for these competitions
        let applications = [];
        let shortlistedCount = 0;
        let interviewedCount = 0;

        if (competitionIds.length > 0) {
            // Need to batch queries if competitionIds > 10
            const batches = [];
            for (let i = 0; i < competitionIds.length; i += 10) {
                const batchIds = competitionIds.slice(i, i + 10);
                batches.push(
                    db.collection('applications')
                        .where('competitionId', 'in', batchIds)
                        .get()
                );
            }

            const appSnapshots = await Promise.all(batches);

            appSnapshots.forEach(snap => {
                snap.forEach(doc => {
                    const app = { id: doc.id, ...doc.data() };
                    applications.push(app);

                    if (app.status) {
                        const status = app.status.toLowerCase();
                        if (status === 'shortlisted') {
                            shortlistedCount++;
                        }
                        if (status === 'interview' || status === 'interviewed' || status === 'scheduled') {
                            interviewedCount++;
                        }
                    }
                });
            });
        }

        const competitionById = new Map(competitions.map((comp) => [comp.id, comp]));
        const applicantsByCompetition = new Map();
        applications.forEach((app) => {
            if (!app.competitionId) return;
            applicantsByCompetition.set(app.competitionId, (applicantsByCompetition.get(app.competitionId) || 0) + 1);
        });

        const recentComps = competitions.slice(0, 5).map((comp) => ({
            ...comp,
            applicants: applicantsByCompetition.get(comp.id) || 0,
            deadline: comp.deadline || comp.projectInfo?.deadline || null,
        }));

        // Sort applications by submittedAt desc
        applications.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
        const recentApps = applications.slice(0, 5).map((app) => ({
            ...app,
            competitionTitle:
                app.competitionTitle ||
                competitionById.get(app.competitionId)?.title ||
                competitionById.get(app.competitionId)?.name ||
                app.competitionId ||
                'Competition',
        }));
        const totalApplications = applications.length;

        // 3. Get reviews for this company
        const reviewsSnap = await db.collection('companies').doc(companyId)
            .collection('reviews')
            .orderBy('createdAt', 'desc')
            .get();

        const allReviews = [];
        let reviewSum = 0;
        reviewsSnap.forEach(doc => {
            const r = { id: doc.id, ...doc.data() };
            allReviews.push(r);
            reviewSum += (r.rating || 0);
        });
        const reviewCount = allReviews.length;
        const averageRating = reviewCount > 0 ? Math.round((reviewSum / reviewCount) * 10) / 10 : 0;
        const recentReviews = allReviews.slice(0, 5);

        // 4. Calculate Chart Analytics (Application Trends & Engagement)
        const labels = [];
        const dailyApplications = [];
        const dailyEngagement = [];
        const now = new Date();

        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
            const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            labels.push(dayLabel);
            
            // Count applications for this day
            const appsOnDay = applications.filter(app => {
                if (!app.submittedAt) return false;
                return app.submittedAt.startsWith(dateStr);
            }).length;
            dailyApplications.push(appsOnDay);
            dailyEngagement.push(0); 
        }

        // 5. Fetch Interviews for Engagement Chart
        const interviewsSnap = await db.collection('interviews')
            .where('companyId', '==', companyId)
            .get();

        if (!interviewsSnap.empty) {
            interviewsSnap.forEach(doc => {
                const data = doc.data();
                if (data.createdAt) {
                    const dateStr = data.createdAt.split('T')[0];
                    for (let i = 0; i < 7; i++) {
                        const checkDate = new Date(now);
                        checkDate.setDate(now.getDate() - (6 - i));
                        if (checkDate.toISOString().split('T')[0] === dateStr) {
                            dailyEngagement[i]++;
                        }
                    }
                }
            });
        }

        const analytics = {
            labels,
            applicationData: dailyApplications,
            engagementData: dailyEngagement
        };

        const stats = [
            { label: 'Active Competitions', value: activeCompetitions.toString(), icon: 'bi-trophy-fill', color: 'orange' },
            { label: 'Total Applications', value: totalApplications.toString(), icon: 'bi-file-earmark-person-fill', color: 'blue' },
            { label: 'Shortlisted', value: shortlistedCount.toString(), icon: 'bi-person-check-fill', color: 'green' },
            { label: 'Reviews', value: reviewCount.toString(), icon: 'bi-star-fill', color: 'purple' },
        ];

        res.status(200).json({ stats, recentComps, recentApps, recentReviews, averageRating, reviewCount, analytics });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create company
router.post('/', async (req, res) => {
    try {
        const payload = req.body;
        payload.createdAt = new Date().toISOString();

        const docRef = await db.collection('companies').add(payload);
        res.status(201).json({ id: docRef.id, ...payload });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Request Plan Change OTP
router.post('/request-plan-change-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Expire in 10 mins
        await db.collection('otps').doc(`billing_${email}`).set({
            otp,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 10 * 60000).toISOString()
        });

        // Send Email Verification
        await transporter.sendMail({
            from: process.env.EMAIL_USER || 'no-reply@proveit.io',
            to: email,
            subject: 'Billing Plan Upgrade OTP - ProveIt.io',
            text: `Your confirmation OTP specifically requested to change your ProveIt company billing plan is: ${otp}. Do not share this pin with anyone. It expires in 10 minutes.`
        });

        res.status(200).json({ message: 'OTP sent successfully to company owner email.' });
    } catch (error) {
        console.error('OTP request error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verify Plan Change OTP
router.post('/verify-plan-change-otp', async (req, res) => {
    try {
        const { email, otp, companyId, newPlan } = req.body;
        if (!email || !otp || !companyId || !newPlan) {
            return res.status(400).json({ error: 'Missing required configuration fields' });
        }

        const otpDocRef = db.collection('otps').doc(`billing_${email}`);
        const otpDoc = await otpDocRef.get();

        if (!otpDoc.exists) {
            return res.status(400).json({ error: 'OTP expired or not found. Please request a new one.' });
        }

        const data = otpDoc.data();
        if (data.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        if (new Date().toISOString() > data.expiresAt) {
            return res.status(400).json({ error: 'OTP has expired' });
        }

        // OTP Valid - Update the Company Plan securely
        const companyRef = db.collection('companies').doc(companyId);
        const companyDoc = await companyRef.get();
        const companyData = companyDoc.data();

        await companyRef.update({
            'plan': newPlan,
            'subscriptionId': `sub_${Math.random().toString(36).substr(2, 9)}`, // Dummy logic enforcing subscription renewal securely
            'updatedAt': new Date().toISOString()
        });

        // Determine price based on current platform pricing
        let amount = 0;
        if (newPlan.toLowerCase() === 'growth') amount = 499;
        if (newPlan.toLowerCase() === 'elite' || newPlan.toLowerCase() === 'enterprise') amount = 1299;

        // Create Payment Transaction
        if (amount > 0) {
            const paymentData = {
                companyId,
                companyName: companyData.name || 'Company',
                amount: amount,
                plan: newPlan,
                status: 'SUCCESS',
                method: 'INTERNAL_UPGRADE',
                createdAt: new Date().toISOString(),
                transactionId: `txn_${Math.random().toString(36).substr(2, 12).toUpperCase()}`
            };
            await db.collection('payments').add(paymentData);

            // Create/Update Subscription record
            const subData = {
                companyId,
                plan: newPlan,
                status: 'ACTIVE',
                validFrom: new Date().toISOString(),
                validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                updatedAt: new Date().toISOString()
            };
            
            // Check if sub exists
            const existingSub = await db.collection('subscriptions')
                .where('companyId', '==', companyId)
                .limit(1)
                .get();

            if (existingSub.empty) {
                await db.collection('subscriptions').add(subData);
            } else {
                await db.collection('subscriptions').doc(existingSub.docs[0].id).update(subData);
            }

            // Add Admin Activity Log
            await db.collection('activityLogs').add({
                action: 'PLAN_UPGRADE',
                severity: 'SUCCESS',
                description: `${companyData.name || 'A company'} upgraded to ${newPlan} plan. Revenue: ₹${amount}`,
                createdAt: new Date().toISOString()
            });
        }

        // Cleanup OTP
        await otpDocRef.delete();

        res.status(200).json({ message: 'Plan successfully updated!', newPlan });
    } catch (error) {
        console.error('Verify Plan OTP Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update company
router.put('/:id', async (req, res) => {
    try {
        const companyRef = db.collection('companies').doc(req.params.id);
        const updates = req.body;

        await companyRef.update(updates);
        res.status(200).json({ id: req.params.id, ...updates, message: 'Company updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete company
router.delete('/:id', async (req, res) => {
    try {
        const companyRef = db.collection('companies').doc(req.params.id);
        await companyRef.delete();
        res.status(200).json({ message: 'Company deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
