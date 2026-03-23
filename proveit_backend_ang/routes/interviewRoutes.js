const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Get all interviews
router.get('/', async (req, res) => {
    try {
        const snapshot = await db.collection('interviews').get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }
        let interviews = [];
        snapshot.forEach(doc => {
            interviews.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).json(interviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get interviews by company ID
router.get('/company/:companyId', async (req, res) => {
    try {
        const companyId = req.params.companyId;
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
        res.status(200).json(interviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get interview by ID
router.get('/:id', async (req, res) => {
    try {
        const doc = await db.collection('interviews').doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Interview not found' });
        }
        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const { checkInterviewEnabled } = require('../utils/planLimits');

// Create interview
router.post('/', async (req, res) => {
    try {
        const { companyId } = req.body;
        
        // --- ENFORCE PLAN LIMITS ---
        if (companyId) {
            const limitCheck = await checkInterviewEnabled(companyId);
            if (!limitCheck.allowed) {
                return res.status(403).json({ error: limitCheck.error });
            }
        }
        // ---------------------------

        const payload = {
            status: 'scheduled',
            decision: null,
            ...req.body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const docRef = await db.collection('interviews').add(payload);
        res.status(201).json({ id: docRef.id, ...payload });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
