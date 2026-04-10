const express = require('express');
const router = express.Router();
const { checkAiChatEnabled } = require('../utils/planLimits');

const { db } = require('../config/firebase');

// n8n Webhook URL
const N8N_WEBHOOK_URL = 'https://arjav1212.app.n8n.cloud/webhook-test/64afd809-5530-407f-901a-84ec4d83af59';
// const N8N_WEBHOOK_URL = 'https://n8n-latest-vvzy.onrender.com/webhook/64afd809-5530-407f-901a-84ec4d83af59';

router.post('/chat', async (req, res) => {
    try {
        const { companyId, chatInput, sessionId } = req.body;

        // --- ENFORCE PLAN LIMITS (Only if companyId is provided, e.g. logged in company) ---
        if (companyId) {
            const limitCheck = await checkAiChatEnabled(companyId);
            if (!limitCheck.allowed) {
                return res.status(403).json({ error: limitCheck.error });
            }
        }
        // ---------------------------

        // Fallback to minimal info if no input provided
        if (!chatInput) return res.status(400).json({ error: 'Chat input is required' });

        // Forward request securely
        const fetch = (await import('node-fetch')).default;

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chatInput,
                sessionId,
                companyId // Send companyId for personalized n8n logic if needed
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`n8n error: ${response.status} - ${errText}`);
        }

        const data = await response.text();
        res.status(200).send(data);

    } catch (error) {
        console.error('AI Proxy Error:', error);
        res.status(500).json({ error: 'Failed to process AI chat request' });
    }
});

/**
 * Knowledge Context API for n8n HTTP Nodes
 * Provides real-time data about the platform to feed into AI models.
 */
router.get('/context', async (req, res) => {
    try {
        const [plansSnap, companiesSnap, competitionsSnap] = await Promise.all([
            db.collection('plans').get(),
            db.collection('companies').limit(20).get(), // Limit for context brevity
            db.collection('competitions').where('status', '==', 'active').limit(15).get()
        ]);

        // 1. Format Plans
        let plans = plansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (plans.length === 0) {
            plans = [
                { name: 'Starter', price: 'Free', features: ['2 Competitions/month', 'Basic Support'] },
                { name: 'Growth', price: '₹499/month', features: ['10 Competitions/month', 'Interview Scheduling'] },
                { name: 'Elite', price: '₹1299/month', features: ['Unlimited Competitions', 'AI Chatbot Support'] }
            ];
        }

        // 2. Format Companies
        const companies = companiesSnap.docs.map(doc => {
            const data = doc.data();
            return {
                name: data.name || data.companyName,
                industry: data.industry || 'Tech',
                plan: data.plan
            };
        });

        // 3. Format Competitions
        const competitions = competitionsSnap.docs.map(doc => {
            const data = doc.data();
            return {
                title: data.title,
                prize: data.prize || data.reward,
                category: data.category,
                company: data.companyName
            };
        });

        res.status(200).json({
            platformName: 'ProveIt.io',
            lastUpdated: new Date().toISOString(),
            context: {
                subscriptionPlans: plans,
                featuredCompanies: companies,
                activeCompetitions: competitions
            }
        });

    } catch (error) {
        console.error('AI Context Error:', error);
        res.status(500).json({ error: 'Failed to fetch platform context' });
    }
});

module.exports = router;
