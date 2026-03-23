const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Get all projects
router.get('/', async (req, res) => {
    try {
        const snapshot = await db.collection('projects').get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }
        let projects = [];
        snapshot.forEach(doc => {
            projects.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get projects by company ID
router.get('/company/:companyId', async (req, res) => {
    try {
        const companyId = req.params.companyId;
        // In the project schema, companyId is stored to easily filter projects for a company
        const snapshot = await db.collection('projects')
            .where('companyId', '==', companyId)
            .get();

        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        let projects = [];
        snapshot.forEach(doc => {
            projects.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get project by ID
router.get('/:id', async (req, res) => {
    try {
        const doc = await db.collection('projects').doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create project
router.post('/', async (req, res) => {
    try {
        const payload = req.body;
        payload.createdAt = new Date().toISOString();
        payload.updatedAt = new Date().toISOString();

        const docRef = await db.collection('projects').add(payload);
        res.status(201).json({ id: docRef.id, ...payload });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update project
router.put('/:id', async (req, res) => {
    try {
        const projectId = req.params.id;
        const updates = { ...req.body, updatedAt: new Date().toISOString() };
        const docRef = db.collection('projects').doc(projectId);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Project not found' });
        }

        await docRef.update(updates);
        const updatedDoc = await docRef.get();

        res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data(), message: 'Project updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
