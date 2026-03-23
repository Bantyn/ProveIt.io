const express = require('express');
const router = express.Router();
const { checkAiChatEnabled } = require('../utils/planLimits');

// n8n Webhook URL
const N8N_WEBHOOK_URL = 'https://yashank3729.app.n8n.cloud/webhook/64afd809-5530-407f-901a-84ec4d83af59';
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

module.exports = router;
