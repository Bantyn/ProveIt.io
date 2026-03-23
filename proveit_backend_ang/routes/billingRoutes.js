const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Get subscription by company ID
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

// Get payments by company ID
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
        res.status(200).json(payments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
