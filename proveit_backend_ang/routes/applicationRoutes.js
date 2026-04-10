const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { checkShortlistLimit, checkApplicationLimit } = require('../utils/planLimits');
const { normalizeApplicationPayload } = require('../utils/demoPayloads');

const applicationResponseCache = new Map();
const APPLICATION_CACHE_TTL_MS = 15000;

function getCachedApplicationResponse(key) {
    const cached = applicationResponseCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.createdAt > APPLICATION_CACHE_TTL_MS) {
        applicationResponseCache.delete(key);
        return null;
    }

    return cached.payload;
}

function setCachedApplicationResponse(key, payload) {
    applicationResponseCache.set(key, {
        payload,
        createdAt: Date.now(),
    });
}

// Get all applications
router.get('/', async (req, res) => {
    try {
        const snapshot = await db.collection('applications').get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }
        let applications = [];
        snapshot.forEach(doc => {
            applications.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).json(applications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get application by ID
router.get('/:id', async (req, res) => {
    try {
        const cached = getCachedApplicationResponse(`applications:id:${req.params.id}`);
        if (cached) {
            return res.status(200).json(cached);
        }

        const appRef = db.collection('applications').doc(req.params.id);
        const doc = await appRef.get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Application not found' });
        }
        const payload = { id: doc.id, ...doc.data() };
        setCachedApplicationResponse(`applications:id:${req.params.id}`, payload);
        res.status(200).json(payload);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get applications by user ID
router.get('/user/:userId', async (req, res) => {
    try {
        const snapshot = await db.collection('applications')
            .where('userId', '==', req.params.userId)
            .get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }
        let applications = [];
        snapshot.forEach(doc => {
            applications.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).json(applications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get applications by competition ID
router.get('/competition/:competitionId', async (req, res) => {
    try {
        const cacheKey = `applications:competition:${req.params.competitionId}`;
        const cached = getCachedApplicationResponse(cacheKey);
        if (cached) {
            return res.status(200).json(cached);
        }

        const snapshot = await db.collection('applications')
            .where('competitionId', '==', req.params.competitionId)
            .get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }
        let applications = [];
        snapshot.forEach(doc => {
            applications.push({ id: doc.id, ...doc.data() });
        });
        setCachedApplicationResponse(cacheKey, applications);
        res.status(200).json(applications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create application
router.post('/', async (req, res) => {
    try {
        const payload = normalizeApplicationPayload(req.body);
        const { userId, competitionId, companyId } = payload;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // --- PREVENT JOINING CLOSED COMPETITIONS ---
        if (competitionId) {
            const compRef = db.collection('competitions').doc(competitionId);
            const compDoc = await compRef.get();
            if (!compDoc.exists) {
                return res.status(404).json({ error: 'Competition not found' });
            }

            const compData = compDoc.data();
            const status = (compData.status || '').toUpperCase();
            
            // 1. Check Explicit Status
            if (status === 'CLOSED' || status === 'COMPLETED' || status === 'INACTIVE') {
                 return res.status(403).json({ error: 'This competition is closed and no longer accepting submissions.' });
            }

            // 2. Check End Date / Deadline
            const rawEndDate = compData.endDate || compData.deadline || compData.projectInfo?.deadline;
            if (rawEndDate) {
                const endDate = new Date(rawEndDate);
                // If deadline is just a date, assume end of day
                if (endDate.getHours() === 0 && endDate.getMinutes() === 0) {
                    endDate.setHours(23, 59, 59, 999);
                }
                if (Date.now() > endDate.getTime()) {
                    return res.status(403).json({ error: 'The deadline for this competition has passed.' });
                }
            }

            // 3. Check Start Date
            const rawStartDate = compData.startDate || compData.projectInfo?.startDate;
            if (rawStartDate) {
                const startDate = new Date(rawStartDate);
                startDate.setHours(0, 0, 0, 0);
                if (Date.now() < startDate.getTime()) {
                    return res.status(403).json({ error: 'This competition has not started yet.' });
                }
            }
        }
        // -------------------------------------------

        // --- ENFORCE PLAN LIMITS ---
        if (competitionId && companyId) {
            const limitCheck = await checkApplicationLimit(competitionId, companyId);
            if (!limitCheck.allowed) {
                return res.status(403).json({ error: limitCheck.error });
            }
        }
        // ---------------------------

        // Check if user has already applied to THIS specific competition
        const existsSnapshot = await db.collection('applications')
            .where('userId', '==', userId)
            .where('competitionId', '==', competitionId)
            .get();

        if (!existsSnapshot.empty) {
            return res.status(400).json({ error: 'You have already applied for this competition.' });
        }

        // Check if user already has an active application across the platform
        const snapshot = await db.collection('applications')
            .where('userId', '==', userId)
            .get();

        const activeApp = snapshot.docs.find(doc => {
            const data = doc.data();
            const status = (data.status || '').toUpperCase();
            // Blocking statuses: anything that isn't terminal (REJECTED or SELECTED)
            return status !== 'REJECTED' && status !== 'SELECTED';
        });

        if (activeApp) {
            return res.status(400).json({ 
                error: 'You already have an active application. You cannot apply for a new one until your current application is rejected or completed.' 
            });
        }
        // ----------------------------------------------------------

        payload.submittedAt = new Date().toISOString();

        const docRef = await db.collection('applications').add(payload);
        res.status(201).json({ id: docRef.id, ...payload });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update application
router.put('/:id', async (req, res) => {
    try {
        const appRef = db.collection('applications').doc(req.params.id);
        const updates = req.body;

        // --- ENFORCE PLAN LIMITS FOR SHORTLISTING ---
        if (updates.status && updates.status.toUpperCase() === 'SHORTLISTED') {
            const appDoc = await appRef.get();
            if (appDoc.exists) {
                const appData = appDoc.data();
                const limitCheck = await checkShortlistLimit(appData.competitionId, appData.companyId);
                if (!limitCheck.allowed) {
                    return res.status(403).json({ error: limitCheck.error });
                }
            }
        }
        // --------------------------------------------

        const oldSnap = await appRef.get();
        const oldData = oldSnap.exists ? oldSnap.data() : null;

        await appRef.update(updates);

        // --- CREATE NOTIFICATION ON STATUS CHANGE ---
        if (updates.status && oldData && updates.status !== oldData.status) {
            const statusLabels = {
                'REJECTED': 'Rejected ❌',
                'SELECTED': 'Selected 🎉',
                'SHORTLISTED': 'Shortlisted ✅',
                'UNDER_EVALUATION': 'Under Evaluation 🔍',
                'UNDER_REVELUTION': 'Under Evaluation 🔍',
                'PENDING': 'Pending ⏳'
            };

            const label = statusLabels[updates.status.toUpperCase()] || updates.status;
            
            await db.collection('notifications').add({
                userId: oldData.userId,
                title: 'Application Update',
                message: `Your application for "${oldData.competitionTitle || 'Competition'}" is now ${label}.`,
                type: 'APPLICATION_STATUS',
                status: updates.status,
                competitionId: oldData.competitionId,
                read: false,
                createdAt: new Date().toISOString()
            });
        }
        // --------------------------------------------

        res.status(200).json({ id: req.params.id, ...updates, message: 'Application updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete application
router.delete('/:id', async (req, res) => {
    try {
        const appRef = db.collection('applications').doc(req.params.id);
        await appRef.delete();
        res.status(200).json({ message: 'Application deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get applications by company ID
router.get('/company/:companyId', async (req, res) => {
    try {
        const companyId = req.params.companyId;
        const cacheKey = `applications:company:${companyId}`;
        const cached = getCachedApplicationResponse(cacheKey);
        if (cached) {
            return res.status(200).json(cached);
        }

        const snapshot = await db.collection('applications')
            .where('companyId', '==', companyId)
            .get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }
        let applications = [];
        snapshot.forEach(doc => {
            applications.push({ id: doc.id, ...doc.data() });
        });
        setCachedApplicationResponse(cacheKey, applications);
        res.status(200).json(applications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
