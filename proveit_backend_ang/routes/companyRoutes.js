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

const dashboardCache = new Map();
const DASHBOARD_CACHE_TTL_MS = 15000;
const responseCache = new Map();
const RESPONSE_CACHE_TTL_MS = 30000;

function getCachedDashboard(companyId) {
    const cached = dashboardCache.get(companyId);
    if (!cached) return null;

    if (Date.now() - cached.createdAt > DASHBOARD_CACHE_TTL_MS) {
        dashboardCache.delete(companyId);
        return null;
    }

    return cached.payload;
}

function setCachedDashboard(companyId, payload) {
    dashboardCache.set(companyId, {
        payload,
        createdAt: Date.now(),
    });
}

function getCachedResponse(key) {
    const cached = responseCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.createdAt > RESPONSE_CACHE_TTL_MS) {
        responseCache.delete(key);
        return null;
    }

    return cached.payload;
}

function setCachedResponse(key, payload) {
    responseCache.set(key, {
        payload,
        createdAt: Date.now(),
    });
}

// Get all companies (Standard HTTP)
router.get('/', async (req, res) => {
    try {
        const cached = getCachedResponse('companies:list');
        if (cached) {
            return res.status(200).json(cached);
        }

        const companiesRef = db.collection('companies');
        const snapshot = await companiesRef.get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }
        let companies = [];
        snapshot.forEach(doc => {
            companies.push({ id: doc.id, ...doc.data() });
        });
        setCachedResponse('companies:list', companies);
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
        const cached = getCachedResponse(`companies:owner:${ownerId}`);
        if (cached) {
            return res.status(200).json(cached);
        }

        const snapshot = await db.collection('companies')
            .where('ownerId', '==', ownerId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ error: 'Company not found for this owner' });
        }

        const doc = snapshot.docs[0];
        const payload = { id: doc.id, ...doc.data() };
        setCachedResponse(`companies:owner:${ownerId}`, payload);
        res.status(200).json(payload);
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
        const cached = getCachedResponse(`companies:id:${req.params.id}`);
        if (cached) {
            return res.status(200).json(cached);
        }

        const companyRef = db.collection('companies').doc(req.params.id);
        const doc = await companyRef.get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const payload = { id: doc.id, ...doc.data() };
        setCachedResponse(`companies:id:${req.params.id}`, payload);
        res.status(200).json(payload);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get company dashboard data
router.get('/:id/dashboard', async (req, res) => {
    try {
        const companyId = req.params.id;
        const cachedDashboard = getCachedDashboard(companyId);

        if (cachedDashboard) {
            return res.status(200).json(cachedDashboard);
        }

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

        // 4. Calculate Chart Analytics (single-pass aggregation)
        const labels = [];
        const dailyApplications = [];
        const dailyEngagement = [];
        const now = new Date();
        const dayKeys = [];
        const applicationCountByDay = new Map();
        const engagementCountByDay = new Map();

        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
            const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            labels.push(dayLabel);
            dayKeys.push(dateStr);
            applicationCountByDay.set(dateStr, 0);
            engagementCountByDay.set(dateStr, 0);
        }

        applications.forEach((app) => {
            const dateStr = app.submittedAt?.split('T')?.[0];
            if (dateStr && applicationCountByDay.has(dateStr)) {
                applicationCountByDay.set(dateStr, (applicationCountByDay.get(dateStr) || 0) + 1);
            }
        });

        dayKeys.forEach((dateStr) => {
            dailyApplications.push(applicationCountByDay.get(dateStr) || 0);
            dailyEngagement.push(0);
        });

        // 5. Fetch Interviews for Engagement Chart
        const interviewsSnap = await db.collection('interviews')
            .where('companyId', '==', companyId)
            .get();

        if (!interviewsSnap.empty) {
            interviewsSnap.forEach(doc => {
                const data = doc.data();
                const dateStr = data.createdAt?.split('T')?.[0];
                if (dateStr && engagementCountByDay.has(dateStr)) {
                    engagementCountByDay.set(dateStr, (engagementCountByDay.get(dateStr) || 0) + 1);
                }
            });
        }

        dayKeys.forEach((dateStr, index) => {
            dailyEngagement[index] = engagementCountByDay.get(dateStr) || 0;
        });

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

        const payload = { stats, recentComps, recentApps, recentReviews, averageRating, reviewCount, analytics };
        setCachedDashboard(companyId, payload);

        res.status(200).json(payload);
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

        // OTP Valid - Fetch company data and existing subscription in parallel
        const [companyDoc, existingSub] = await Promise.all([
            db.collection('companies').doc(companyId).get(),
            db.collection('subscriptions')
                .where('companyId', '==', companyId)
                .limit(1)
                .get(),
        ]);

        const companyData = companyDoc.exists ? companyDoc.data() : {};

        // Determine price based on current platform pricing
        let amount = 0;
        if (newPlan.toLowerCase() === 'growth') amount = 499;
        if (newPlan.toLowerCase() === 'elite' || newPlan.toLowerCase() === 'enterprise') amount = 1299;

        const now = new Date().toISOString();

        // BATCHED WRITE — All mutations in one atomic operation
        const batch = db.batch();

        // Update company plan
        const companyRef = db.collection('companies').doc(companyId);
        batch.update(companyRef, {
            plan: newPlan,
            subscriptionId: `sub_${Math.random().toString(36).substr(2, 9)}`,
            updatedAt: now,
        });

        // Create Payment record (if paid plan)
        if (amount > 0) {
            const paymentRef = db.collection('payments').doc();
            batch.set(paymentRef, {
                companyId,
                companyName: companyData.name || 'Company',
                amount,
                plan: newPlan,
                status: 'SUCCESS',
                method: 'INTERNAL_UPGRADE',
                createdAt: now,
                transactionId: `txn_${Math.random().toString(36).substr(2, 12).toUpperCase()}`,
            });

            // Create/Update Subscription
            const subData = {
                companyId,
                plan: newPlan,
                status: 'ACTIVE',
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
                description: `${companyData.name || 'A company'} upgraded to ${newPlan} plan. Revenue: ₹${amount}`,
                createdAt: now,
            });
        }

        // Cleanup OTP
        batch.delete(otpDocRef);

        // Commit all writes atomically
        await batch.commit();

        // Invalidate caches
        dashboardCache.delete(companyId);
        responseCache.delete(`companies:id:${companyId}`);
        responseCache.delete('companies:list');

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
