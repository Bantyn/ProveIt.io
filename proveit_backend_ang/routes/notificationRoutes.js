const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Get notifications for a specific user
router.get('/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const snapshot = await db.collection('notifications')
            .where('userId', '==', userId)
            .limit(100)
            .get();

        const notifications = [];
        snapshot.forEach(doc => {
            notifications.push({ id: doc.id, ...doc.data() });
        });

        // Sort in-memory with robust date handling
        notifications.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        });
        
        // Return only the top 50
        res.status(200).json(notifications.slice(0, 50));
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
    try {
        await db.collection('notifications').doc(req.params.id).update({
            read: true
        });
        res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear all notifications for a user
router.delete('/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const snapshot = await db.collection('notifications')
            .where('userId', '==', userId)
            .get();

        if (snapshot.empty) {
            return res.status(200).json({ message: 'No notifications to clear' });
        }

        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        res.status(200).json({ message: 'All notifications cleared' });
    } catch (error) {
        console.error('Error clearing notifications:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
