const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { normalizeCompetitionPayload } = require('../utils/demoPayloads');

const competitionResponseCache = new Map();
const COMPETITION_CACHE_TTL_MS = 30000;

function getCachedCompetitionResponse(key) {
    const cached = competitionResponseCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.createdAt > COMPETITION_CACHE_TTL_MS) {
        competitionResponseCache.delete(key);
        return null;
    }

    return cached.payload;
}

function setCachedCompetitionResponse(key, payload) {
    competitionResponseCache.set(key, {
        payload,
        createdAt: Date.now(),
    });
}

// Get all competitions (Standard HTTP)
router.get('/', async (req, res) => {
    try {
        const cached = getCachedCompetitionResponse('competitions:list');
        if (cached) {
            return res.status(200).json(cached);
        }

        const snapshot = await db.collection('competitions').get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }
        let competitions = [];
        snapshot.forEach(doc => {
            competitions.push({ id: doc.id, ...doc.data() });
        });
        setCachedCompetitionResponse('competitions:list', competitions);
        res.status(200).json(competitions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stream all competitions (Server-Sent Events)
router.get('/stream', (req, res) => {
    // 1. Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // flush the headers to establish SSE connection immediately

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    // 2. Attach Firestore snapshot listener
    const unsubscribe = db.collection('competitions').onSnapshot((snapshot) => {
        let competitions = [];
        snapshot.forEach(doc => {
            competitions.push({ id: doc.id, ...doc.data() });
        });

        // 3. Send data to client
        res.write(`data: ${JSON.stringify(competitions)}\n\n`);
    }, (error) => {
        console.error("SSE Firebase Error:", error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    });

    // 4. Handle client disconnect
    req.on('close', () => {
        console.log('Client closed competition SSE connection');
        unsubscribe(); // Detach listener to prevent memory leaks
    });
});


// Get competition by ID
router.get('/:id', async (req, res) => {
    try {
        const cached = getCachedCompetitionResponse(`competitions:id:${req.params.id}`);
        if (cached) {
            return res.status(200).json(cached);
        }

        const compRef = db.collection('competitions').doc(req.params.id);
        const doc = await compRef.get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Competition not found' });
        }
        const payload = { id: doc.id, ...doc.data() };
        setCachedCompetitionResponse(`competitions:id:${req.params.id}`, payload);
        res.status(200).json(payload);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get competitions by company ID
router.get('/company/:companyId', async (req, res) => {
    try {
        const cacheKey = `competitions:company:${req.params.companyId}`;
        const cached = getCachedCompetitionResponse(cacheKey);
        if (cached) {
            return res.status(200).json(cached);
        }

        const snapshot = await db.collection('competitions')
            .where('companyId', '==', req.params.companyId)
            .get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }
        let competitions = [];
        snapshot.forEach(doc => {
            competitions.push({ id: doc.id, ...doc.data() });
        });
        setCachedCompetitionResponse(cacheKey, competitions);
        res.status(200).json(competitions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const { checkCompetitionLimit } = require('../utils/planLimits');

// Create competition
router.post('/', async (req, res) => {
    try {
        const payload = normalizeCompetitionPayload(req.body);
        const { companyId } = payload;

        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }

        // --- ENFORCE PLAN LIMITS ---
        const limitCheck = await checkCompetitionLimit(companyId);
        if (!limitCheck.allowed) {
            return res.status(403).json({ error: limitCheck.error });
        }
        // ---------------------------

        payload.postedAt = new Date().toISOString();

        const docRef = await db.collection('competitions').add(payload);
        res.status(201).json({ id: docRef.id, ...payload });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update competition
router.put('/:id', async (req, res) => {
    try {
        const compRef = db.collection('competitions').doc(req.params.id);
        const existingDoc = await compRef.get();

        if (!existingDoc.exists) {
            return res.status(404).json({ error: 'Competition not found' });
        }

        const updates = normalizeCompetitionPayload(req.body, existingDoc.data());

        await compRef.update(updates);
        res.status(200).json({ id: req.params.id, ...updates, message: 'Competition updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete competition
router.delete('/:id', async (req, res) => {
    try {
        const compRef = db.collection('competitions').doc(req.params.id);
        await compRef.delete();
        res.status(200).json({ message: 'Competition deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
