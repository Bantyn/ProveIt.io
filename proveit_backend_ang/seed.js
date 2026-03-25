const { admin, db } = require('./config/firebase');

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
      interviews: {
        enabled: false,
        maxRoundsPerApplication: 1,
      },
      analytics: {
        advancedAnalytics: false,
        leaderboardAccess: false,
      },
      branding: {
        brandingCustomization: false,
      },
      ai: {
        chatbotSupport: false,
      },
      pipeline: {
        enabled: false,
      },
      messaging: {
        enabled: true,
        unlockStage: 'NONE',
        maxActiveChats: 5,
        allowFileSharing: false,
        maxAttachmentSizeMB: 0,
      },
      support: {
        prioritySupport: false,
      },
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
      interviews: {
        enabled: true,
        maxRoundsPerApplication: 2,
      },
      analytics: {
        advancedAnalytics: true,
        leaderboardAccess: true,
      },
      branding: {
        brandingCustomization: false,
      },
      ai: {
        chatbotSupport: true,
      },
      pipeline: {
        enabled: true,
      },
      messaging: {
        enabled: true,
        unlockStage: 'SUBMITTED',
        maxActiveChats: 25,
        allowFileSharing: true,
        maxAttachmentSizeMB: 10,
      },
      support: {
        prioritySupport: false,
      },
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
      interviews: {
        enabled: true,
        maxRoundsPerApplication: 5,
      },
      analytics: {
        advancedAnalytics: true,
        leaderboardAccess: true,
      },
      branding: {
        brandingCustomization: true,
      },
      ai: {
        chatbotSupport: true,
      },
      pipeline: {
        enabled: true,
      },
      messaging: {
        enabled: true,
        unlockStage: 'NONE',
        maxActiveChats: 999999,
        allowFileSharing: true,
        maxAttachmentSizeMB: 50,
      },
      support: {
        prioritySupport: true,
      },
    },
  },
];

const DEFAULT_ADMIN = {
  fullName: 'Admin User',
  email: 'admin@gmail.com',
  password: 'admin@123',
  adminRole: 'ADMIN',
  userRole: 'admin',
  status: 'active',
};

async function clearFirebaseAuthUsers() {
  console.log('\nClearing Firebase Authentication users...\n');

  let nextPageToken;
  let deletedCount = 0;

  do {
    const result = await admin.auth().listUsers(1000, nextPageToken);
    const uids = result.users.map((user) => user.uid);

    if (uids.length > 0) {
      const deleteResult = await admin.auth().deleteUsers(uids);
      deletedCount += deleteResult.successCount;

      if (deleteResult.failureCount > 0) {
        deleteResult.errors.forEach((entry) => {
          console.log(`  WARN auth user ${entry.index} - ${entry.error.message}`);
        });
      }
    }

    nextPageToken = result.pageToken;
  } while (nextPageToken);

  console.log(`  OK   Firebase Auth cleared - ${deletedCount} users removed`);
}

async function clearCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.limit(1).get();

  if (snapshot.empty) {
    console.log(`  OK   ${collectionName} - already empty`);
    return;
  }

  await db.recursiveDelete(collectionRef);
  console.log(`  OK   ${collectionName} - cleared`);
}

async function truncateAllCollections() {
  console.log('\nClearing Firestore collections...\n');

  for (const collectionName of ROOT_COLLECTIONS) {
    try {
      await clearCollection(collectionName);
    } catch (error) {
      console.log(`  WARN ${collectionName} - ${error.message}`);
    }
  }
}

async function seedRoles() {
  console.log('\nSeeding roles...\n');
  let adminRoleId = null;

  for (const role of DEFAULT_ROLES) {
    const ref = await db.collection('roles').add({
      ...role,
      createdAt: new Date().toISOString(),
    });

    console.log(`  OK   role created - ${role.name}`);
    if (role.name === 'Admin') {
      adminRoleId = ref.id;
    }
  }

  return { adminRoleId };
}

async function seedPlans() {
  console.log('\nSeeding plans...\n');

  for (const plan of DEFAULT_PLANS) {
    await db.collection('plans').add({
      ...plan,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log(`  OK   plan created - ${plan.name}`);
  }
}

async function seedSystemSettings() {
  console.log('\nSeeding system settings...\n');

  await db.collection('systemSettings').doc('global').set(DEFAULT_SYSTEM_SETTINGS);
  console.log('  OK   systemSettings/global created');
}

async function recreateAuthUser(account) {
  const authUser = await admin.auth().createUser({
    email: account.email,
    password: account.password,
    displayName: account.fullName,
    emailVerified: true,
    disabled: false,
  });

  console.log(`  OK   Firebase Auth user created - ${authUser.uid}`);
  return authUser;
}

async function seedAdminAccount(account, roleRefId, logMessage) {
  console.log(`\nCreating ${account.fullName}...\n`);

  const authUser = await recreateAuthUser(account);
  const timestamp = new Date().toISOString();

  await db.collection('users').doc(authUser.uid).set({
    name: account.fullName,
    fullName: account.fullName,
    email: account.email,
    role: account.userRole,
    status: account.status,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await db.collection('admins').doc(authUser.uid).set({
    fullName: account.fullName,
    email: account.email,
    role: account.adminRole,
    status: account.status,
    roleRef: roleRefId,
    isDeleted: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await db.collection('activityLogs').add({
    action: 'Database Seed',
    severity: 'INFO',
    description: logMessage,
    actorRole: 'SYSTEM',
    createdAt: timestamp,
  });

  console.log(`  OK   users/${authUser.uid} created`);
  console.log(`  OK   admins/${authUser.uid} created`);

  return authUser.uid;
}

async function main() {
  console.log('===============================================');
  console.log('ProveIt.io - Firestore Reset & Seed');
  console.log('===============================================');

  await clearFirebaseAuthUsers();
  await truncateAllCollections();
  const seededRoleIds = await seedRoles();
  await seedPlans();
  await seedSystemSettings();
  const adminUid = await seedAdminAccount(
    DEFAULT_ADMIN,
    seededRoleIds.adminRoleId,
    'Fresh Firestore seed executed and default admin recreated.',
  );

  console.log('\n===============================================');
  console.log('ADMIN LOGIN');
  console.log('===============================================');
  console.log(`Admin UID : ${adminUid}`);
  console.log(`Email     : ${DEFAULT_ADMIN.email}`);
  console.log(`Password  : ${DEFAULT_ADMIN.password}`);
  console.log('===============================================\n');
  console.log('Done. Firestore reset and seed completed.\n');
}

main().catch((error) => {
  console.error('\nSeed failed:', error);
  process.exit(1);
});
