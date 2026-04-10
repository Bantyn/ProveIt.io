function cleanString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim();
}

function cleanArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function cleanNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}

function normalizeCompetitionPayload(input = {}, existing = {}) {
  const existingProjectInfo = existing.projectInfo || {};
  const endDate =
    input.endDate ||
    input.deadline ||
    input.projectInfo?.deadline ||
    existing.endDate ||
    existing.deadline ||
    existingProjectInfo.deadline ||
    null;

  return compactObject({
    companyId: input.companyId || existing.companyId,
    ownerId: input.ownerId || existing.ownerId,
    companyName: cleanString(input.companyName || existing.companyName),
    title: cleanString(input.title || input.name || existing.title || existing.name),
    description: cleanString(input.description || existing.description),
    competitionType:
      cleanString(input.competitionType || input.projectType || existing.competitionType).toUpperCase() ||
      'SKILL',
    industry: cleanString(input.industry || existing.industry) || 'TECHNOLOGY',
    startDate: input.startDate || existing.startDate || null,
    endDate,
    rules: cleanString(input.rules || existing.rules),
    requiredSkills: cleanArray(
      input.requiredSkills || input.skillsRequired || existing.requiredSkills || existing.skillsRequired,
    ),
    img_url: cleanString(input.img_url || input.imageUrl || existing.img_url || existing.imageUrl),
    status: input.status || existing.status || 'ACTIVE',
    visibility: input.visibility || existing.visibility || 'public',
    jobId: input.jobId || existing.jobId,
    projectInfo: {
      title: cleanString(input.title || input.name || existingProjectInfo.title || existing.title || existing.name),
      difficulty:
        cleanString(input.difficulty || input.projectInfo?.difficulty || existingProjectInfo.difficulty).toUpperCase() ||
        'MEDIUM',
      deadline: endDate,
      maxCandidates: cleanNumber(
        input.maxCandidates || input.projectInfo?.maxCandidates || existingProjectInfo.maxCandidates,
        50,
      ),
      maxSubmissions: cleanNumber(input.projectInfo?.maxSubmissions || existingProjectInfo.maxSubmissions, 1),
    },
  });
}

function normalizeApplicationPayload(input = {}) {
  const feedback = cleanString(input.feedback || input.projectSummary);

  return compactObject({
    userId: input.userId,
    competitionId: input.competitionId,
    companyId: input.companyId,
    jobId: input.jobId,
    competitionType: cleanString(input.competitionType).toUpperCase() || 'SKILL',
    candidateName: cleanString(input.candidateName || input.applicantName) || 'Candidate',
    profileImage: cleanString(input.profileImage),
    status: cleanString(input.status) || 'applied',
    feedback,
    projectSummary: cleanString(input.projectSummary) || feedback,
    submissionLink: cleanString(input.submissionLink),
    projectId: input.projectId,
  });
}

function normalizeProjectPayload(input = {}, existing = {}) {
  const submissionType =
    cleanString(input.submissionType || existing.submissionType).toUpperCase() || 'GITHUB';
  const submissionLink =
    cleanString(input.submissionLink || input.repoUrl || input.liveUrl || existing.submissionLink) ||
    '';
  const liveDemoLink = cleanString(input.liveDemoLink || input.liveUrl || existing.liveUrl);
  const techStack = cleanArray(input.techStack || existing.techStack);
  const explanationText = cleanString(
    input.explanation?.howItWorks || input.howItWorks || existing.explanation?.howItWorks,
  );
  const externalLinks = Array.isArray(input.externalLinks)
    ? input.externalLinks.filter((link) => link?.url)
    : liveDemoLink
      ? [{ label: 'Live Demo', url: liveDemoLink }]
      : existing.externalLinks || [];

  return compactObject({
    applicationId: input.applicationId || existing.applicationId,
    userId: input.userId || existing.userId,
    companyId: input.companyId || existing.companyId,
    competitionId: input.competitionId || existing.competitionId,
    candidateName: cleanString(input.candidateName || existing.candidateName) || 'Candidate',
    title: cleanString(input.title || existing.title),
    description: cleanString(input.description || existing.description),
    submissionType,
    submissionLink,
    repoUrl:
      submissionType === 'GITHUB'
        ? submissionLink
        : cleanString(input.repoUrl || existing.repoUrl),
    liveUrl:
      submissionType !== 'GITHUB'
        ? submissionLink
        : liveDemoLink || cleanString(existing.liveUrl),
    techStack,
    externalLinks,
    explanation: explanationText ? { howItWorks: explanationText } : existing.explanation,
    aiScore: input.aiScore ?? existing.aiScore ?? 0,
    plagiarism: input.plagiarism || existing.plagiarism || '0%',
    status: input.status || existing.status || 'pending',
    submittedAt: input.submittedAt || existing.submittedAt || new Date().toISOString(),
  });
}

module.exports = {
  normalizeCompetitionPayload,
  normalizeApplicationPayload,
  normalizeProjectPayload,
};
