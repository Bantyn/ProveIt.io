/**
 * ProveIt.io — Database Reset & Admin Seed (ESM)
 *
 * Usage:  node seed.mjs
 *
 * What it does:
 *   1. Deletes ALL Firebase Auth users
 *   2. Truncates every known Firestore collection
 *   3. Seeds default roles, plans, and system settings
 *   4. Creates a single admin account  →  admin@gmail.com / admin@123
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Re-use the existing CommonJS Firebase config
const { admin, db } = require('./config/firebase');

// ─── Constants ──────────────────────────────────────────────────────────────

const ROOT_COLLECTIONS = [
  'activityLogs',
  'admins',
  'applications',
  'candidateProfiles',
  'chats',
  'companies',
  'competitions',
  'contactMessages',
  'faqs',
  'interviews',
  'messages',
  'notifications',
  'otps',
  'payments',
  'plans',
  'projects',
  'roles',
  'subscriptions',
  'supportTickets',
  'systemSettings',
  'testimonials',
  'users',
];

const DEFAULT_SYSTEM_SETTINGS = {
  maintenanceMode: false,
  registrationOpen: true,
  aiAssistantEnabled: true,
  plagiarismCheckEnabled: true,
  maxFileUploadMB: 50,
  defaultPlan: 'STARTER',
  supportEmail: 'support@proveit.io',
  platformVersion: '2.1.4',
  updatedAt: new Date().toISOString(),
};

const DEFAULT_ROLES = [
  {
    name: 'Admin',
    description: 'Can manage users, companies, competitions and support tickets.',
    permissions: [
      'user_management',
      'company_management',
      'competition_management',
      'application_management',
      'support_management',
    ],
    isSystem: true,
  },
  {
    name: 'Support Manager',
    description: 'Can review incoming support and contact requests.',
    permissions: ['support_management', 'ticket_resolution', 'view_users'],
    isSystem: true,
  },
  {
    name: 'Viewer',
    description: 'Read-only access for monitoring the admin console.',
    permissions: ['view_dashboard', 'view_users', 'view_companies', 'view_support'],
    isSystem: true,
  },
];

const DEFAULT_PLANS = [
  {
    name: 'STARTER',
    priceMonthly: 0,
    priceYearly: 0,
    isActive: true,
    description: 'For new companies starting their skill-based hiring journey.',
    features: {
      competitions: {
        maxCompetitionsPerMonth: 2,
        maxActiveCompetitions: 1,
        maxApplicationsPerCompetition: 50,
        maxShortlistedPerCompetition: 5,
      },
      interviews: { enabled: false, maxRoundsPerApplication: 1 },
      analytics: { advancedAnalytics: false, leaderboardAccess: false },
      branding: { brandingCustomization: false },
      ai: { chatbotSupport: false },
      pipeline: { enabled: false },
      messaging: {
        enabled: true,
        unlockStage: 'NONE',
        maxActiveChats: 5,
        allowFileSharing: false,
        maxAttachmentSizeMB: 0,
      },
      support: { prioritySupport: false },
    },
  },
  {
    name: 'GROWTH',
    priceMonthly: 499,
    priceYearly: 4990,
    isActive: true,
    description: 'For scaling businesses actively hiring top talent.',
    features: {
      competitions: {
        maxCompetitionsPerMonth: 10,
        maxActiveCompetitions: 5,
        maxApplicationsPerCompetition: 200,
        maxShortlistedPerCompetition: 25,
      },
      interviews: { enabled: true, maxRoundsPerApplication: 2 },
      analytics: { advancedAnalytics: true, leaderboardAccess: true },
      branding: { brandingCustomization: false },
      ai: { chatbotSupport: true },
      pipeline: { enabled: true },
      messaging: {
        enabled: true,
        unlockStage: 'SUBMITTED',
        maxActiveChats: 25,
        allowFileSharing: true,
        maxAttachmentSizeMB: 10,
      },
      support: { prioritySupport: false },
    },
  },
  {
    name: 'ELITE',
    priceMonthly: 1299,
    priceYearly: 12990,
    isActive: true,
    description: 'Unlimited potential for enterprise hiring.',
    features: {
      competitions: {
        maxCompetitionsPerMonth: 999999,
        maxActiveCompetitions: 999999,
        maxApplicationsPerCompetition: 999999,
        maxShortlistedPerCompetition: 999999,
      },
      interviews: { enabled: true, maxRoundsPerApplication: 5 },
      analytics: { advancedAnalytics: true, leaderboardAccess: true },
      branding: { brandingCustomization: true },
      ai: { chatbotSupport: true },
      pipeline: { enabled: true },
      messaging: {
        enabled: true,
        unlockStage: 'NONE',
        maxActiveChats: 999999,
        allowFileSharing: true,
        maxAttachmentSizeMB: 50,
      },
      support: { prioritySupport: true },
    },
  },
];

const ADMIN_ACCOUNT = {
  fullName: 'Admin User',
  email: 'admin@gmail.com',
  password: 'admin@123',
  adminRole: 'ADMIN',
  userRole: 'admin',
  status: 'active',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function clearFirebaseAuthUsers() {
  console.log('\n🔑  Clearing Firebase Authentication users...\n');
  let nextPageToken;
  let deletedCount = 0;

  do {
    const result = await admin.auth().listUsers(1000, nextPageToken);
    const uids = result.users.map((u) => u.uid);

    if (uids.length > 0) {
      const deleteResult = await admin.auth().deleteUsers(uids);
      deletedCount += deleteResult.successCount;

      if (deleteResult.failureCount > 0) {
        deleteResult.errors.forEach((entry) =>
          console.log(`  ⚠  auth user ${entry.index} – ${entry.error.message}`),
        );
      }
    }

    nextPageToken = result.pageToken;
  } while (nextPageToken);

  console.log(`  ✓  Firebase Auth cleared – ${deletedCount} users removed`);
}

async function clearCollection(name) {
  const ref = db.collection(name);
  const snap = await ref.limit(1).get();

  if (snap.empty) {
    console.log(`  ✓  ${name} – already empty`);
    return;
  }

  await db.recursiveDelete(ref);
  console.log(`  ✓  ${name} – cleared`);
}

async function truncateAllCollections() {
  console.log('\n🗑️   Clearing Firestore collections...\n');

  for (const name of ROOT_COLLECTIONS) {
    try {
      await clearCollection(name);
    } catch (err) {
      console.log(`  ⚠  ${name} – ${err.message}`);
    }
  }
}

async function seedRoles() {
  console.log('\n📋  Seeding roles...\n');
  let adminRoleId = null;

  for (const role of DEFAULT_ROLES) {
    const ref = await db.collection('roles').add({
      ...role,
      createdAt: new Date().toISOString(),
    });
    console.log(`  ✓  role created – ${role.name}`);
    if (role.name === 'Admin') adminRoleId = ref.id;
  }

  return adminRoleId;
}

async function seedPlans() {
  console.log('\n💳  Seeding plans...\n');

  for (const plan of DEFAULT_PLANS) {
    await db.collection('plans').add({
      ...plan,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log(`  ✓  plan created – ${plan.name}`);
  }
}

async function seedSystemSettings() {
  console.log('\n⚙️   Seeding system settings...\n');
  await db.collection('systemSettings').doc('global').set(DEFAULT_SYSTEM_SETTINGS);
  console.log('  ✓  systemSettings/global created');
}

async function seedAdmin(adminRoleId) {
  console.log('\n👤  Creating admin account...\n');
  const ts = new Date().toISOString();

  // Create Firebase Auth user
  const authUser = await admin.auth().createUser({
    email: ADMIN_ACCOUNT.email,
    password: ADMIN_ACCOUNT.password,
    displayName: ADMIN_ACCOUNT.fullName,
    emailVerified: true,
    disabled: false,
  });
  console.log(`  ✓  Firebase Auth user created – ${authUser.uid}`);

  // Create users document
  await db.collection('users').doc(authUser.uid).set({
    name: ADMIN_ACCOUNT.fullName,
    fullName: ADMIN_ACCOUNT.fullName,
    email: ADMIN_ACCOUNT.email,
    role: ADMIN_ACCOUNT.userRole,
    status: ADMIN_ACCOUNT.status,
    createdAt: ts,
    updatedAt: ts,
  });
  console.log(`  ✓  users/${authUser.uid} created`);

  // Create admins document
  await db.collection('admins').doc(authUser.uid).set({
    fullName: ADMIN_ACCOUNT.fullName,
    email: ADMIN_ACCOUNT.email,
    role: ADMIN_ACCOUNT.adminRole,
    status: ADMIN_ACCOUNT.status,
    roleRef: adminRoleId,
    isDeleted: false,
    createdAt: ts,
    updatedAt: ts,
  });
  console.log(`  ✓  admins/${authUser.uid} created`);

  // Activity log
  await db.collection('activityLogs').add({
    action: 'Database Seed',
    severity: 'INFO',
    description: 'Fresh database reset & admin account seeded.',
    actorRole: 'SYSTEM',
    createdAt: ts,
  });

  return authUser.uid;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  ProveIt.io — Database Reset & Admin Seed');
  console.log('═══════════════════════════════════════════════');

  await clearFirebaseAuthUsers();
  await truncateAllCollections();

  const adminRoleId = await seedRoles();
  await seedPlans();
  await seedSystemSettings();

  const adminUid = await seedAdmin(adminRoleId);

  console.log('\n═══════════════════════════════════════════════');
  console.log('  ADMIN LOGIN CREDENTIALS');
  console.log('═══════════════════════════════════════════════');
  console.log(`  UID      : ${adminUid}`);
  console.log(`  Email    : ${ADMIN_ACCOUNT.email}`);
  console.log(`  Password : ${ADMIN_ACCOUNT.password}`);
  console.log('═══════════════════════════════════════════════');
  console.log('\n✅  Done. Database reset and seed completed.\n');
}

main().catch((err) => {
  console.error('\n❌  Seed failed:', err);
  process.exit(1);
});
