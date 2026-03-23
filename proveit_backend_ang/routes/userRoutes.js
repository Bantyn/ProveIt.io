const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // User can change this to their SMTP provider
    auth: {
        user: process.env.EMAIL_USER || 'no-reply@proveit.io',
        pass: process.env.EMAIL_PASS || 'default-password-change-me'
    }
});

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        // Verify if user exists in Firebase Auth
        await admin.auth().getUserByEmail(email);

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to Firestore
        await db.collection('otps').doc(email).set({
            otp,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 10 * 60000).toISOString() // 10 minutes expiry
        });

        // Send Email
        await transporter.sendMail({
            from: process.env.EMAIL_USER || 'no-reply@proveit.io',
            to: email,
            subject: 'Password Reset OTP - ProveIt.io',
            text: `Your password reset OTP is ${otp}. It is valid for 10 minutes.`
        });

        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ error: 'Missing required fields' });

        const otpDocRef = db.collection('otps').doc(email);
        const otpDoc = await otpDocRef.get();

        if (!otpDoc.exists) return res.status(400).json({ error: 'OTP expired or not found' });

        const data = otpDoc.data();
        if (data.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

        if (new Date().toISOString() > data.expiresAt) {
            return res.status(400).json({ error: 'OTP has expired' });
        }

        res.status(200).json({ message: 'OTP verified successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Reset Password - Verify OTP & Update Password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Missing required fields' });

        const otpDocRef = db.collection('otps').doc(email);
        const otpDoc = await otpDocRef.get();

        if (!otpDoc.exists) return res.status(400).json({ error: 'OTP expired or not found' });

        const data = otpDoc.data();
        if (data.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

        if (new Date().toISOString() > data.expiresAt) {
            return res.status(400).json({ error: 'OTP has expired' });
        }

        const userRecord = await admin.auth().getUserByEmail(email);
        await admin.auth().updateUser(userRecord.uid, { password: newPassword });

        // Delete OTP after successful reset
        await otpDocRef.delete();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all users
router.get('/', async (req, res) => {
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }
        let users = [];
        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = doc.data();

        // Also fetch candidate profile if it exists
        const profileRef = db.collection('candidateProfiles').doc(userId);
        const profileDoc = await profileRef.get();

        const candidateProfile = profileDoc.exists ? profileDoc.data() : null;

        res.status(200).json({
            id: doc.id,
            ...userData,
            candidateProfile
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create user
router.post('/', async (req, res) => {
    try {
        const newUser = req.body;
        // Non-AI project: sanitize any AI specific fields
        delete newUser.aiScore;

        newUser.createdAt = new Date().toISOString();

        let docRef;
        if (newUser.id) {
            // Allows using a predetermined ID like from Firebase Auth
            const docId = newUser.id;
            delete newUser.id;
            await db.collection('users').doc(docId).set(newUser);
            docRef = { id: docId };
        } else {
            docRef = await db.collection('users').add(newUser);
        }

        res.status(201).json({ id: docRef.id, ...newUser });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const userRef = db.collection('users').doc(userId);
        const updates = req.body;

        // Ensure no AI logic
        delete updates.aiScore;

        await userRef.update(updates);

        // Synchronize with candidateProfiles if profile data is provided
        if (updates.isProfileCompleted) {
            const candidateProfileRef = db.collection('candidateProfiles').doc(userId);

            // Construct education array if data exists
            let education = [];
            if (updates.degree || updates.college || updates.graduationYear) {
                education.push({
                    degree: updates.degree || '',
                    college: updates.college || '',
                    year: updates.graduationYear ? parseInt(updates.graduationYear, 10) : null
                });
            }

            // Construct skills array with format required by Model.md
            let skillsData = [];
            if (updates.skills && Array.isArray(updates.skills)) {
                skillsData = updates.skills.map(skillName => ({
                    name: skillName,
                    level: "Intermediate", // Default level if none provided
                    years: 0
                }));
            }

            const profileUpdates = {
                userId: userId,
                experienceLevel: updates.experienceLevel || 'Fresher',
                github: updates.github || '',
                resumeUrl: updates.resumeUrl || '',
                updatedAt: new Date().toISOString()
            };

            if (skillsData.length > 0) profileUpdates.skills = skillsData;
            if (education.length > 0) profileUpdates.education = education;

            await candidateProfileRef.set(profileUpdates, { merge: true });
        }

        res.status(200).json({ id: userId, ...updates, message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    try {
        const userRef = db.collection('users').doc(req.params.id);
        await userRef.delete();
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
