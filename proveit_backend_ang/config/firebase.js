const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

let serviceAccount;

try {
    serviceAccount = require('./serviceAccountKey.json');
} catch (error) {
    console.log("No serviceAccountKey.json found. You must configure this file or use environment variables.");
    serviceAccount = {
        type: process.env.FIREBASE_TYPE,
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI,
        token_uri: process.env.FIREBASE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    };
}

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin Initialized Successfully.');
} catch (error) {
    console.error('Firebase Admin Initialization Error:', error.message);
}

const db = admin.firestore();

// Firestore performance settings
db.settings({
    ignoreUndefinedProperties: true,
    preferRest: true, // Use REST instead of gRPC — eliminates cold-start overhead
});

module.exports = { admin, db };
