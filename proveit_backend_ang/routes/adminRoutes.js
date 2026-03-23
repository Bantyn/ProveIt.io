const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

const SYSTEM_SETTINGS_DOC_ID = 'global';

const defaultSystemSettings = {
    maintenanceMode: false,
    registrationOpen: true,
    aiAssistantEnabled: true,
    plagiarismCheckEnabled: true,
    maxFileUploadMB: 50,
    defaultPlan: 'Free',
    supportEmail: 'support@proveit.io',
    platformVersion: '2.1.4',
    updatedAt: new Date().toISOString(),
};

const defaultRoles = [
    {
        name: 'Super Admin',
        description: 'Full platform access and governance controls.',
        permissions: ['system_settings', 'maintenance_control', 'billing_control', 'user_management', 'company_management', 'role_management', 'support_management'],
        isSystem: true,
        createdAt: new Date().toISOString(),
    },
    {
        name: 'Admin',
        description: 'Can manage users, companies, competitions and support tickets.',
        permissions: ['user_management', 'company_management', 'competition_management', 'application_management', 'support_management'],
        isSystem: true,
        createdAt: new Date().toISOString(),
    },
    {
        name: 'Support Manager',
        description: 'Can review incoming support and contact requests.',
        permissions: ['support_management', 'ticket_resolution', 'view_users'],
        isSystem: true,
        createdAt: new Date().toISOString(),
    },
    {
        name: 'Viewer',
        description: 'Read-only access for monitoring the admin console.',
        permissions: ['view_dashboard', 'view_users', 'view_companies', 'view_support'],
        isSystem: true,
        createdAt: new Date().toISOString(),
    },
];

async function ensureSystemSettings() {
    const ref = db.collection('systemSettings').doc(SYSTEM_SETTINGS_DOC_ID);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
        await ref.set(defaultSystemSettings);
        return { ...defaultSystemSettings };
    }

    return { ...defaultSystemSettings, ...snapshot.data() };
}

async function ensureRoles() {
    const rolesRef = db.collection('roles');
    const snapshot = await rolesRef.get();

    if (!snapshot.empty) {
        return snapshot;
    }

    for (const role of defaultRoles) {
        await rolesRef.add(role);
    }

    return rolesRef.get();
}

// Get global admin dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const [usersSnap, companiesSnap, competitionsSnap, applicationsSnap, paymentsSnap, subscriptionsSnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('companies').get(),
            db.collection('competitions').get(),
            db.collection('applications').get(),
            db.collection('payments').where('status', '==', 'SUCCESS').get(),
            db.collection('subscriptions').where('status', '==', 'ACTIVE').get()
        ]);

        const totalUsers = usersSnap.size;
        const totalCompanies = companiesSnap.size;
        const totalCompetitions = competitionsSnap.size;
        const totalApplications = applicationsSnap.size;
        const activeSubscriptions = subscriptionsSnap.size;

        let totalRevenue = 0;
        paymentsSnap.forEach(doc => {
            totalRevenue += (doc.data().amount || 0);
        });

        // Mock growth metrics (could be calculated based on createdAt timestamps)
        const userGrowth = 12; // Example %
        const revenueGrowth = 18; // Example %

        res.status(200).json({
            totalUsers,
            totalCompanies,
            totalCompetitions,
            totalApplications,
            activeSubscriptions,
            totalRevenue,
            userGrowth,
            revenueGrowth
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get recent activity logs
router.get('/logs', async (req, res) => {
    try {
        const snapshot = await db.collection('activityLogs')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        if (snapshot.empty) {
            // Return some mock logs if none exist yet, to keep the UI looking good
            return res.status(200).json([
                {
                    id: 'ml1',
                    action: 'System Initialization',
                    severity: 'INFO',
                    description: 'Platform services started successfully.',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'ml2',
                    action: 'Database Connected',
                    severity: 'INFO',
                    description: 'Firebase connection established.',
                    createdAt: new Date(Date.now() - 3600000).toISOString()
                }
            ]);
        }

        let logs = [];
        snapshot.forEach(doc => {
            logs.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get analytics data for charts (e.g., last 7 days)
router.get('/analytics', async (req, res) => {
    try {
        const labels = [];
        const revenueData = [];
        const userData = [];

        // Generate last 7 days labels
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        }

        // Fetch real payments for revenue chart
        const paymentsSnap = await db.collection('payments')
            .where('status', '==', 'SUCCESS')
            .get();

        const dailyRevenue = new Array(7).fill(0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        paymentsSnap.forEach(doc => {
            const data = doc.data();
            const payDate = new Date(data.createdAt);
            payDate.setHours(0, 0, 0, 0);

            const diffTime = today.getTime() - payDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays < 7) {
                dailyRevenue[6 - diffDays] += (data.amount || 0);
            }
        });

        // Mock users for now but keep them relative to current total
        const usersSnap = await db.collection('users').get();
        const totalUsers = usersSnap.size;
        for (let i = 0; i < 7; i++) {
            userData.push(Math.floor(totalUsers * (0.7 + (0.3 * i / 6))));
            revenueData.push(dailyRevenue[i]);
        }

        res.status(200).json({
            labels,
            userData,
            revenueData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get system settings
router.get('/system-settings', async (req, res) => {
    try {
        const settings = await ensureSystemSettings();
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update system settings
router.put('/system-settings', async (req, res) => {
    try {
        const settingsRef = db.collection('systemSettings').doc(SYSTEM_SETTINGS_DOC_ID);
        const currentSettings = await ensureSystemSettings();
        const updates = {
            ...currentSettings,
            ...req.body,
            updatedAt: new Date().toISOString(),
        };

        await settingsRef.set(updates, { merge: true });

        await db.collection('activityLogs').add({
            action: 'SYSTEM_SETTINGS_UPDATED',
            severity: 'SUCCESS',
            description: `System settings updated. Maintenance mode is now ${updates.maintenanceMode ? 'enabled' : 'disabled'}.`,
            createdAt: new Date().toISOString(),
        });

        res.status(200).json(updates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get support tickets
router.get('/support', async (req, res) => {
    try {
        const snapshot = await db.collection('supportTickets').orderBy('createdAt', 'desc').get();
        let tickets = [];
        snapshot.forEach(doc => tickets.push({ id: doc.id, ...doc.data() }));
        res.status(200).json(tickets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create support ticket from public contact/support forms
router.post('/support', async (req, res) => {
    try {
        const {
            name,
            email,
            subject,
            message,
            priority,
            source,
            phone,
        } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'name, email, subject and message are required' });
        }

        const payload = {
            name,
            email,
            subject,
            message,
            phone: phone || '',
            priority: priority || 'medium',
            status: 'open',
            source: source || 'contact',
            createdAt: new Date().toISOString(),
        };

        const docRef = await db.collection('supportTickets').add(payload);

        await db.collection('activityLogs').add({
            action: 'NEW_SUPPORT_TICKET',
            severity: 'INFO',
            description: `New support ticket received from ${email}.`,
            createdAt: new Date().toISOString(),
        });

        res.status(201).json({ id: docRef.id, ...payload });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update support ticket
router.patch('/support/:id', async (req, res) => {
    try {
        const ticketRef = db.collection('supportTickets').doc(req.params.id);
        const updates = {
            ...req.body,
            updatedAt: new Date().toISOString(),
        };

        await ticketRef.update(updates);
        res.status(200).json({ id: req.params.id, ...updates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get FAQs
router.get('/faqs', async (req, res) => {
    try {
        const snapshot = await db.collection('faqs').get();
        let faqs = [];
        snapshot.forEach(doc => faqs.push({ id: doc.id, ...doc.data() }));
        res.status(200).json(faqs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Testimonials
router.get('/testimonials', async (req, res) => {
    try {
        const snapshot = await db.collection('testimonials').get();
        let testimonials = [];
        snapshot.forEach(doc => testimonials.push({ id: doc.id, ...doc.data() }));
        res.status(200).json(testimonials);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Roles
router.get('/roles', async (req, res) => {
    try {
        const [snapshot, usersSnapshot] = await Promise.all([
            ensureRoles(),
            db.collection('users').get(),
        ]);

        const roleUsage = {};
        usersSnapshot.forEach((doc) => {
            const user = doc.data();
            const roleName = (user.role || 'Candidate').toString().trim().toLowerCase();
            roleUsage[roleName] = (roleUsage[roleName] || 0) + 1;
        });

        let roles = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const roleName = (data.name || '').toString().trim().toLowerCase();
            roles.push({
                id: doc.id,
                ...data,
                userCount: roleUsage[roleName] || 0,
            });
        });
        res.status(200).json(roles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create role
router.post('/roles', async (req, res) => {
    try {
        const { name, description, permissions, isSystem } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Role name is required' });
        }

        const payload = {
            name: name.trim(),
            description: description || '',
            permissions: Array.isArray(permissions) ? permissions : [],
            isSystem: Boolean(isSystem),
            createdAt: new Date().toISOString(),
        };

        const docRef = await db.collection('roles').add(payload);
        res.status(201).json({ id: docRef.id, ...payload, userCount: 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update role
router.put('/roles/:id', async (req, res) => {
    try {
        const roleRef = db.collection('roles').doc(req.params.id);
        const current = await roleRef.get();

        if (!current.exists) {
            return res.status(404).json({ error: 'Role not found' });
        }

        const updates = {
            name: req.body.name,
            description: req.body.description || '',
            permissions: Array.isArray(req.body.permissions) ? req.body.permissions : [],
            updatedAt: new Date().toISOString(),
        };

        await roleRef.update(updates);
        res.status(200).json({ id: req.params.id, ...updates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete role
router.delete('/roles/:id', async (req, res) => {
    try {
        const roleRef = db.collection('roles').doc(req.params.id);
        const snapshot = await roleRef.get();

        if (!snapshot.exists) {
            return res.status(404).json({ error: 'Role not found' });
        }

        const role = snapshot.data();
        if (role.isSystem) {
            return res.status(400).json({ error: 'System roles cannot be deleted' });
        }

        await roleRef.delete();
        res.status(200).json({ message: 'Role deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Payments
router.get('/payments', async (req, res) => {
    try {
        const snapshot = await db.collection('payments')
            .orderBy('createdAt', 'desc')
            .get();
        let payments = [];
        snapshot.forEach(doc => payments.push({ id: doc.id, ...doc.data() }));
        res.status(200).json(payments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Plans
router.get('/plans', async (req, res) => {
    try {
        const snapshot = await db.collection('plans').get();
        if (snapshot.empty) {
            const defaultPlans = [
                {
                    name: 'STARTER',
                    price: 0,
                    features: {
                        competitions: {
                            maxCompetitionsPerMonth: 2,
                            maxApplicationsPerCompetition: 50,
                            maxShortlistedPerCompetition: 5
                        },
                        messaging: { enabled: true }
                    },
                    description: "For new companies starting their skill-based hiring journey.",
                    createdAt: new Date().toISOString()
                },
                {
                    name: 'GROWTH',
                    price: 499,
                    features: {
                        competitions: {
                            maxCompetitionsPerMonth: 10,
                            maxApplicationsPerCompetition: 200,
                            maxShortlistedPerCompetition: 25
                        },
                        messaging: { enabled: true }
                    },
                    description: "For scaling businesses actively hiring top talent.",
                    createdAt: new Date().toISOString()
                },
                {
                    name: 'ELITE',
                    price: 1299,
                    features: {
                        competitions: {
                            maxCompetitionsPerMonth: 999999,
                            maxApplicationsPerCompetition: 999999,
                            maxShortlistedPerCompetition: 999999
                        },
                        messaging: { enabled: true }
                    },
                    description: "Unlimited potential for enterprise hiring.",
                    createdAt: new Date().toISOString()
                }
            ];
            
            for (const plan of defaultPlans) {
                await db.collection('plans').add(plan);
            }
            
            const newSnap = await db.collection('plans').get();
            let plans = [];
            newSnap.forEach(doc => plans.push({ id: doc.id, ...doc.data() }));
            return res.status(200).json(plans);
        }

        let plans = [];
        snapshot.forEach(doc => plans.push({ id: doc.id, ...doc.data() }));
        
        // Ensure they are always ordered: STARTER, GROWTH, ELITE
        const order = { 'STARTER': 1, 'GROWTH': 2, 'ELITE': 3 };
        plans.sort((a, b) => (order[a.name] || 99) - (order[b.name] || 99));

        res.status(200).json(plans);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Plan
router.put('/plans/:id', async (req, res) => {
    try {
        const planRef = db.collection('plans').doc(req.params.id);
        const updates = req.body;
        updates.updatedAt = new Date().toISOString();
        await planRef.update(updates);
        res.status(200).json({ id: req.params.id, ...updates, message: 'Plan updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
