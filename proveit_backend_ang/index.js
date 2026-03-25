const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { db } = require('./config/firebase');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const maintenanceSettingsCache = {
    value: null,
    fetchedAt: 0,
};
const MAINTENANCE_CACHE_TTL_MS = 30000;

app.use(async (req, res, next) => {
    try {
        if (
            req.path === '/api/health' ||
            req.path.startsWith('/api/admin') ||
            req.headers['x-admin-bypass'] === 'true'
        ) {
            return next();
        }

        const now = Date.now();
        let settings = maintenanceSettingsCache.value;

        if (!settings || now - maintenanceSettingsCache.fetchedAt > MAINTENANCE_CACHE_TTL_MS) {
            const settingsDoc = await db.collection('systemSettings').doc('global').get();
            settings = settingsDoc.exists ? settingsDoc.data() : null;
            maintenanceSettingsCache.value = settings;
            maintenanceSettingsCache.fetchedAt = now;
        }

        if (settings?.maintenanceMode) {
            return res.status(503).json({
                error: 'The system is currently under maintenance.',
                maintenanceMode: true,
            });
        }

        return next();
    } catch (error) {
        return next();
    }
});

// Import Routes
const userRoutes = require('./routes/userRoutes');
const companyRoutes = require('./routes/companyRoutes');
const competitionRoutes = require('./routes/competitionRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const projectRoutes = require('./routes/projectRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const billingRoutes = require('./routes/billingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Mount Routes
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ message: 'Backend is running correctly.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
