const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// ── In-memory interview cache ────────────────────────────────────────────────
const interviewCache = new Map();
const INTERVIEW_CACHE_TTL_MS = 15000;

function getCachedInterviewResponse(key) {
    const cached = interviewCache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.createdAt > INTERVIEW_CACHE_TTL_MS) {
        interviewCache.delete(key);
        return null;
    }
    return cached.payload;
}

function setCachedInterviewResponse(key, payload) {
    interviewCache.set(key, { payload, createdAt: Date.now() });
}

function invalidateInterviewCache(companyId) {
    for (const key of interviewCache.keys()) {
        if (key.includes(companyId) || key === 'interviews:all') {
            interviewCache.delete(key);
        }
    }
}

// Get all interviews
router.get('/', async (req, res) => {
    try {
        const cached = getCachedInterviewResponse('interviews:all');
        if (cached) return res.status(200).json(cached);

        const snapshot = await db.collection('interviews').get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }
        let interviews = [];
        snapshot.forEach(doc => {
            interviews.push({ id: doc.id, ...doc.data() });
        });
        setCachedInterviewResponse('interviews:all', interviews);
        res.status(200).json(interviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get interviews by company ID
router.get('/company/:companyId', async (req, res) => {
    try {
        const companyId = req.params.companyId;
        const cacheKey = `interviews:company:${companyId}`;
        const cached = getCachedInterviewResponse(cacheKey);
        if (cached) return res.status(200).json(cached);

        const snapshot = await db.collection('interviews')
            .where('companyId', '==', companyId)
            .get();

        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        let interviews = [];
        snapshot.forEach(doc => {
            interviews.push({ id: doc.id, ...doc.data() });
        });
        setCachedInterviewResponse(cacheKey, interviews);
        res.status(200).json(interviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get interview by ID
router.get('/:id', async (req, res) => {
    try {
        const cacheKey = `interviews:id:${req.params.id}`;
        const cached = getCachedInterviewResponse(cacheKey);
        if (cached) return res.status(200).json(cached);

        const doc = await db.collection('interviews').doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Interview not found' });
        }
        const payload = { id: doc.id, ...doc.data() };
        setCachedInterviewResponse(cacheKey, payload);
        res.status(200).json(payload);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const { checkInterviewEnabled } = require('../utils/planLimits');

// Create interview
router.post('/', async (req, res) => {
    try {
        const { companyId, applicationId, candidateId, candidateName, date, time } = req.body;

        // ── Input validation ─────────────────────────────────────────────
        if (!companyId) {
            return res.status(400).json({ error: 'companyId is required.' });
        }
        if (!applicationId) {
            return res.status(400).json({ error: 'applicationId is required.' });
        }
        if (!candidateId) {
            return res.status(400).json({ error: 'candidateId is required.' });
        }
        if (!date) {
            return res.status(400).json({ error: 'Interview date is required.' });
        }
        if (!time) {
            return res.status(400).json({ error: 'Interview time is required.' });
        }

        // ── Plan limits check ────────────────────────────────────────────
        const limitCheck = await checkInterviewEnabled(companyId);
        if (!limitCheck.allowed) {
            return res.status(403).json({ error: limitCheck.error });
        }

        // ── Duplicate prevention (same applicationId) ────────────────────
        const existingSnap = await db.collection('interviews')
            .where('applicationId', '==', applicationId)
            .limit(1)
            .get();

        if (!existingSnap.empty) {
            return res.status(409).json({
                error: 'An interview has already been scheduled for this application.',
                existingInterviewId: existingSnap.docs[0].id,
            });
        }

        // ── Normalize date/time ──────────────────────────────────────────
        const normalizedDate = typeof date === 'string' ? date.trim() : String(date);
        const normalizedTime = typeof time === 'string' ? time.trim() : String(time);

        const payload = {
            status: 'scheduled',
            decision: null,
            ...req.body,
            date: normalizedDate,
            time: normalizedTime,
            candidateName: candidateName || 'Candidate',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const docRef = await db.collection('interviews').add(payload);

        // ── Invalidate cache ─────────────────────────────────────────────
        invalidateInterviewCache(companyId);

        res.status(201).json({ id: docRef.id, ...payload });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update interview
router.put('/:id', async (req, res) => {
    try {
        const docRef = db.collection('interviews').doc(req.params.id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Interview not found' });
        }

        const updates = {
            ...req.body,
            updatedAt: new Date().toISOString(),
        };

        await docRef.update(updates);

        // Invalidate cache using the interview's companyId
        const companyId = doc.data().companyId;
        if (companyId) {
            invalidateInterviewCache(companyId);
        }

        res.status(200).json({ id: doc.id, ...doc.data(), ...updates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
