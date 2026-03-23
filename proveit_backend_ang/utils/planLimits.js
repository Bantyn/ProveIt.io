const { db } = require('../config/firebase');

/**
 * Common utility to get company plan details
 */
async function getCompanyPlan(companyId) {
    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) return null;
    
    const companyData = companyDoc.data();
    const planName = (companyData.plan || 'STARTER').toUpperCase();
    
    // Fetch plan features from 'plans' collection
    const planSnapshot = await db.collection('plans')
        .where('name', '==', planName)
        .limit(1)
        .get();
        
    if (planSnapshot.empty) {
        // Fallback to hardcoded defaults if plans collection not initialized
        const fallbacks = {
            'STARTER': {
                competitions: { maxCompetitionsPerMonth: 2, maxApplicationsPerCompetition: 50, maxShortlistedPerCompetition: 5 },
                messaging: { enabled: true },
                interviews: { enabled: false }
            },
            'GROWTH': {
                competitions: { maxCompetitionsPerMonth: 10, maxApplicationsPerCompetition: 200, maxShortlistedPerCompetition: 25 },
                messaging: { enabled: true },
                interviews: { enabled: true }
            },
            'ELITE': {
                competitions: { maxCompetitionsPerMonth: 999999, maxApplicationsPerCompetition: 999999, maxShortlistedPerCompetition: 999999 },
                messaging: { enabled: true },
                interviews: { enabled: true }
            }
        };
        return fallbacks[planName] || fallbacks['STARTER'];
    }
    
    return planSnapshot.docs[0].data().features;
}

/**
 * Check if company can create another competition this month
 */
async function checkCompetitionLimit(companyId) {
    const features = await getCompanyPlan(companyId);
    if (!features) return { allowed: false, error: 'Company not found' };
    
    const maxAllowed = features.competitions?.maxCompetitionsPerMonth || 1;
    if (maxAllowed >= 999999) return { allowed: true };

    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Fetch all non-deleted competitions for this company
    const compsSnap = await db.collection('competitions')
        .where('companyId', '==', companyId)
        .get();
        
    const monthlyComps = compsSnap.docs.filter(doc => {
        const data = doc.data();
        if (data.isDeleted) return false;
        // Handle Firestore Timestamp or ISO string
        const postedAt = (data.postedAt && typeof data.postedAt.toDate === 'function') ? data.postedAt.toDate() : new Date(data.postedAt || data.createdAt);
        return postedAt >= startOfMonth && postedAt <= endOfMonth;
    }).length;

    if (monthlyComps >= maxAllowed) {
        return { 
            allowed: false, 
            error: `Monthly competition limit reached (${monthlyComps}/${maxAllowed}). Please upgrade your plan.` 
        };
    }
    
    return { allowed: true };
}

/**
 * Check if company can shortlist more candidates for a competition
 */
async function checkShortlistLimit(competitionId, companyId) {
    const features = await getCompanyPlan(companyId);
    if (!features) return { allowed: false, error: 'Company not found' };
    
    const maxAllowed = features.competitions?.maxShortlistedPerCompetition || 5;
    if (maxAllowed >= 999999) return { allowed: true };

    // Count current shortlisted candidates for this competition
    const appsSnap = await db.collection('applications')
        .where('competitionId', '==', competitionId)
        .get();
        
    const activeShortlisted = appsSnap.docs.filter(doc => (doc.data().status || '').toUpperCase() === 'SHORTLISTED').length;

    if (activeShortlisted >= maxAllowed) {
        return { 
            allowed: false, 
            error: `Shortlisting limit reached for this competition (${activeShortlisted}/${maxAllowed}). Please upgrade your plan.` 
        };
    }
    
    return { allowed: true };
}

/**
 * Check if interview features are enabled
 */
async function checkInterviewEnabled(companyId) {
    const features = await getCompanyPlan(companyId);
    if (!features) return { allowed: false, error: 'Company not found' };
    
    if (!features.interviews?.enabled) {
        return { 
            allowed: false, 
            error: `Interview scheduling is not available in your current plan. Please upgrade.` 
        };
    }
    
    return { allowed: true };
}

/**
 * Check if competition has reached its application limit
 */
async function checkApplicationLimit(competitionId, companyId) {
    const features = await getCompanyPlan(companyId);
    if (!features) return { allowed: false, error: 'Company not found' };

    const compDoc = await db.collection('competitions').doc(competitionId).get();
    if (!compDoc.exists) return { allowed: false, error: 'Competition not found' };
    const compData = compDoc.data();

    // 1. Get competition's own internal limit (set by company)
    const internalMax = compData.projectInfo?.maxCandidates || 999999;
    
    // 2. Get plan-based ceiling
    const planMax = features.competitions?.maxApplicationsPerCompetition || 50;
    
    // The actual limit is the lower of the two
    const maxAllowed = Math.min(internalMax, planMax);
    if (maxAllowed >= 999999) return { allowed: true };

    // Count non-rejected applications
    const appsSnap = await db.collection('applications')
        .where('competitionId', '==', competitionId)
        .get();
        
    const activeCount = appsSnap.docs.filter(doc => {
        const status = (doc.data().status || '').toUpperCase();
        return status !== 'REJECTED';
    }).length;

    if (activeCount >= maxAllowed) {
        return { 
            allowed: false, 
            error: `Submission limit reached for this competition (${activeCount}/${maxAllowed}).` 
        };
    }
    
    return { allowed: true };
}

/**
 * Check if AI Chat features are enabled
 */
async function checkAiChatEnabled(companyId) {
    if (!companyId) return { allowed: true }; // Allow guest users or non-authenticated usage if intended, or set to false to be strict

    const features = await getCompanyPlan(companyId);
    if (!features) return { allowed: false, error: 'Company or Plan not found' };
    
    // Structure in Firestore: features.ai.chatbotSupport (boolean)
    if (features.ai && features.ai.chatbotSupport === false) {
        return { 
            allowed: false, 
            error: `AI Chat features are not available in your current plan. Please upgrade.` 
        };
    }
    
    return { allowed: true };
}

module.exports = {
    checkCompetitionLimit,
    checkShortlistLimit,
    checkInterviewEnabled,
    checkAiChatEnabled,
    checkApplicationLimit
};
