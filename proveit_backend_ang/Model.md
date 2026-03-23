# Data Models

> **Source of Truth:** Supabase PostgreSQL (project: `ehmvtgpnavynexdrlwkq`)
> **Last Synced:** March 17, 2026
> All tables use `uuid` primary keys (auto-generated via `extensions.uuid_generate_v4()` or `gen_random_uuid()`), `timestamptz` timestamps, and RLS is enabled on every table.

---

## 1. Admins (`admins`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),
  full_name: text (required),
  email: text (required, unique),
  password_hash: text (required),

  role: text (required),
    -- CHECK: role IN ('SUPER_ADMIN', 'ADMIN')

  role_ref: UUID (nullable, FK → roles.id),
    -- Links to the RBAC roles table for granular permissions

  status: text (default: 'active'),
    -- CHECK: status IN ('active', 'suspended', 'blocked')

  profile_image: text (nullable),
  phone: text (nullable),

  -- Security
  two_factor_enabled: boolean (default: false),
  two_factor_secret: text (nullable),
  failed_login_attempts: integer (default: 0),
  account_locked_until: timestamptz (nullable),
  last_password_change: timestamptz (nullable),

  -- Audit
  last_login: timestamptz (nullable),
  last_login_ip: text (nullable),

  -- Metadata
  created_by: UUID (nullable),
  notes: text (nullable),

  is_deleted: boolean (default: false),
  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

**Foreign Keys Referencing This Table:**

- `faqs.created_by` → `admins.id`
- `faqs.updated_by` → `admins.id`
- `interviews.decision_by` → `admins.id`
- `contact_messages.assigned_to` → `admins.id`
- `automation_workflows.created_by` → `admins.id`

---

## 2. Roles — RBAC System (`roles`)

> **Architecture:** Permissions are stored in a separate `permissions` table and linked to roles via `role_permissions` (many-to-many). Permission keys use **dot-notation** (`module.action`). Super Admin bypasses all permission checks automatically.

### Roles Table

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),
  name: text (required, unique),
    -- e.g. "SUPER_ADMIN", "ADMIN", "MODERATOR"
  description: text (nullable),
  permissions: text[] (default: '{}'),
    -- Legacy array column; granular permissions now via role_permissions join
  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

### Permissions Table (`permissions`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),
  key: text (required, unique),
    -- Dot-notation key, e.g. "admin.view"
  module: text (required),
    -- Grouping module, e.g. "admin", "company"
  action: text (required),
    -- Action name, e.g. "view", "create"
  description: text (nullable),
  created_at: timestamptz (default: now())
}
```

**Complete Permission Registry (51 keys across 13 modules):**

| Module           | Permissions                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **admin**        | `admin.view`, `admin.create`, `admin.update`, `admin.delete`                                                                                             |
| **company**      | `company.view`, `company.approve`, `company.suspend`, `company.update`, `company.delete`                                                                 |
| **competition**  | `competition.view`, `competition.create`, `competition.update`, `competition.delete`, `competition.publish`, `competition.cancel`                        |
| **candidate**    | `candidate.view`, `candidate.suspend`, `candidate.delete`                                                                                                |
| **testimonial**  | `testimonial.view`, `testimonial.create`, `testimonial.update`, `testimonial.delete`, `testimonial.approve`, `testimonial.reject`, `testimonial.feature` |
| **faq**          | `faq.view`, `faq.create`, `faq.update`, `faq.delete`, `faq.publish`, `faq.archive`, `faq.moderate`                                                       |
| **subscription** | `subscription.view`, `subscription.update`, `subscription.cancel`                                                                                        |
| **plan**         | `plan.view`, `plan.create`, `plan.update`, `plan.delete`                                                                                                 |
| **payment**      | `payment.view`, `payment.refund`                                                                                                                         |
| **ai**           | `ai.config_view`, `ai.config_update`                                                                                                                     |
| **analytics**    | `analytics.view_general`, `analytics.view_financial`                                                                                                     |
| **system**       | `system.settings_view`, `system.settings_update`, `system.evaluation_override`, `system.application_override`                                            |
| **logs**         | `logs.activity_view`, `logs.notification_manage`                                                                                                         |

### Role_Permissions Table — Join (`role_permissions`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),
  role_id: UUID (required, FK → roles.id),
  permission_id: UUID (required, FK → permissions.id),
  created_at: timestamptz (default: now())
  -- UNIQUE constraint on (role_id, permission_id)
}
```

### Server Files

| File                              | Purpose                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `Config/permissions.registry.mjs` | Centralized permission definitions + module grouping helpers                           |
| `Models/permission.model.mjs`     | Read operations for permissions table                                                  |
| `Models/rolePermission.model.mjs` | Join table operations (`findKeysByRoleId`, `replaceForRole`)                           |
| `Utils/permissions.mjs`           | `hasPermission()`, `hasAllPermissions()`, `hasAnyPermission()` with SUPER_ADMIN bypass |
| `Controllers/role.controller.mjs` | CRUD + bulk permission assignment + delete safety + audit logging                      |
| `Routes/role.routes.mjs`          | SUPER_ADMIN-only protected routes                                                      |
| `Middleware/rbac.mjs`             | `requirePermission('module.action')` middleware using `hasPermission()` internally     |

### Frontend Files

| File                             | Purpose                                                |
| -------------------------------- | ------------------------------------------------------ |
| `api/roles.api.js`               | API module for roles & permissions endpoints           |
| `hooks/queries/useRoles.js`      | React Query hooks for role/permission data + mutations |
| `pages/admin/RoleManagement.jsx` | Module-grouped checkbox UI for permission management   |

---

## 3. Users (`users`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),
  full_name: text (required),
  email: text (required, unique),
  password_hash: text (required),

  role: text (required),
    -- CHECK: role IN ('CANDIDATE', 'COMPANY')

  status: text (default: 'active'),
    -- CHECK: status IN ('active', 'suspended', 'blocked')

  profile_image: text (nullable),
  phone: text (nullable),

  -- Security
  two_factor_enabled: boolean (default: false),
  two_factor_secret: text (nullable),
  failed_login_attempts: integer (default: 0),
  account_locked_until: timestamptz (nullable),
  last_password_change: timestamptz (nullable),

  -- Audit
  last_login: timestamptz (nullable),
  last_login_ip: text (nullable),

  -- Metadata
  created_by: UUID (nullable),
  notes: text (nullable),

  is_deleted: boolean (default: false),
  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

**Foreign Keys Referencing This Table:**

- `candidate_profiles.user_id` → `users.id`
- `companies.owner_id` → `users.id`
- `applications.user_id` → `users.id`
- `chats.candidate_id` → `users.id`
- `messages.sender_id` → `users.id`
- `ai_chats.user_id` → `users.id`
- `ai_chats.candidate_id` → `users.id`
- `ai_rate_limits.user_id` → `users.id`
- `notifications.recipient_id` → `users.id`
- `otps.user_id` → `users.id`
- `contact_messages.sender_id` → `users.id`

---

## 4. Candidate Profiles (`candidate_profiles`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  user_id: UUID (required, unique, FK → users.id),

  skills: jsonb (default: '[]'),
    -- Array of { name: string, level: "Beginner"|"Intermediate"|"Advanced"|"Expert", years: number }

  experience_level: text (nullable),
    -- CHECK: experience_level IN ('Fresher', 'Junior', 'Mid-Level', 'Senior', 'Lead')

  education: jsonb (default: '[]'),
    -- Array of { degree: string, college: string, year: number }

  github: text (nullable),
  resume_url: text (nullable),

  metrics: jsonb (default: '{}'),
    -- Structure:
    -- {
    --   participation: { total, hiring, skill },
    --   hiring: { shortlisted, selected, selectionRate },
    --   performance: { avgScore, weightedScore, highestScore, scoreConsistency },
    --   ranking: { wins, topThree, bestRank, globalRankScore }
    -- }

  subscription_id: UUID (nullable),

  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

---

## 5. Companies (`companies`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  owner_id: UUID (required, FK → users.id),

  company_name: text (required),

  industry: text (nullable),
  size: text (nullable),

  -- Public Presence
  website: text (nullable),
  logo: text (nullable),

  social_links: jsonb (default: '{}'),
    -- { linkedin, twitter, instagram, facebook, github, youtube }

  -- Legal Agreements
  legal: jsonb (default: '{}'),
    -- { termsAccepted, termsAcceptedAt, privacyPolicyAccepted, privacyPolicyAcceptedAt, acceptedVersion }

  verification_status: text (default: 'pending'),
    -- CHECK: verification_status IN ('pending', 'approved', 'rejected')

  is_suspended: boolean (default: false),

  subscription_id: UUID (nullable, FK → subscriptions.id),
  job_credits: integer (default: 0),

  stats: jsonb (default: '{}'),
    -- Structure:
    -- {
    --   competitions: { total, hiring, skill, active, completed },
    --   hiring: { totalParticipants, shortlisted, hired, hireRate },
    --   performance: { avgCandidateScore, avgWinningScore, evaluationConsistency },
    --   engagement: { totalSubmissions, avgSubmissionsPerCompetition }
    -- }

  is_deleted: boolean (default: false),

  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

**Foreign Keys Referencing This Table:**

- `competitions.company_id` → `companies.id`
- `jobs.company_id` → `companies.id`
- `applications.company_id` → `companies.id`
- `interviews.company_id` → `companies.id`
- `subscriptions.company_id` → `companies.id`
- `payments.company_id` → `companies.id`
- `chats.company_id` → `companies.id`
- `ai_chats.company_id` → `companies.id`

---

## 6. Competitions (`competitions`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),
  slug: text (required, unique),

  company_id: UUID (required, FK → companies.id),

  title: text (required),
  description: text (nullable),

  competition_type: text (required),
    -- CHECK: competition_type IN ('HIRING', 'SKILL')

  -- Only used if competition_type = 'HIRING'
  job_id: UUID (nullable, FK → jobs.id),

  rules: text (nullable),

  required_skills: text[] (default: '{}'),

  project_info: jsonb (default: '{}'),
    -- { title, difficulty: "EASY"|"MEDIUM"|"HARD", deadline, maxSubmissions }

  visibility: text (default: 'public'),
    -- CHECK: visibility IN ('public', 'private')

  status: text (default: 'DRAFT'),
    -- CHECK: status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED')

  total_applications: integer (default: 0),

  ranking_status: text (default: 'NOT_GENERATED'),
    -- CHECK: ranking_status IN ('NOT_GENERATED', 'GENERATING', 'GENERATED')

  max_participants: integer (nullable),

  start_date: timestamptz (nullable),
  end_date: timestamptz (nullable),

  is_deleted: boolean (default: false),

  created_by_admin_id: UUID (nullable),

  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

---

## 7. Jobs (`jobs`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  company_id: UUID (required, FK → companies.id),

  role: text (nullable),
  department: text (nullable),

  experience_level: text (nullable),
    -- CHECK: experience_level IN ('Fresher', 'Junior', 'Mid-Level', 'Senior', 'Lead')

  employment_type: text (nullable),
    -- CHECK: employment_type IN ('Full-Time', 'Part-Time', 'Internship', 'Contract')

  salary_range: jsonb (default: '{}'),
    -- { min: number, max: number, currency: string }

  required_skills: text[] (default: '{}'),

  status: text (default: 'active'),
    -- CHECK: status IN ('active', 'closed')

  is_deleted: boolean (default: false),

  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

**Foreign Keys Referencing This Table:**

- `competitions.job_id` → `jobs.id`
- `applications.job_id` → `jobs.id`

---

## 8. Applications (`applications`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  user_id: UUID (required, FK → users.id),
  competition_id: UUID (required, FK → competitions.id),
  company_id: UUID (required, FK → companies.id),

  competition_type: text (required),
    -- CHECK: competition_type IN ('HIRING', 'SKILL')

  -- Optional if competition is tied to a job role
  job_id: UUID (nullable, FK → jobs.id),

  status: text (default: 'APPLIED'),
    -- CHECK: status IN ('APPLIED', 'SUBMITTED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'SELECTED', 'REJECTED')

  scoring: jsonb (default: '{"score": 0, "rank": null, "percentile": null}'),
    -- { score: number, rank: number|null, percentile: number|null }

  feedback: text (nullable),

  audit: jsonb (default: '{}'),
    -- { evaluatedBy: UUID, evaluatedAt: timestamptz }

  is_deleted: boolean (default: false),

  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

> **Unique Constraint:** `(user_id, competition_id)` — one application per user per competition.

**Foreign Keys Referencing This Table:**

- `projects.application_id` → `applications.id`
- `interviews.application_id` → `applications.id`
- `chats.application_id` → `applications.id`

---

## 9. Projects (`projects`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  application_id: UUID (required, FK → applications.id),

  submission_type: text (nullable),
    -- CHECK: submission_type IN ('GITHUB', 'FILE_UPLOAD', 'EXTERNAL_LINK', 'DOCUMENT')

  files: jsonb (default: '[]'),
    -- Array of { fileName, fileUrl, sizeMB, mimeType }

  external_links: jsonb (default: '[]'),
    -- Array of { label, url }

  tech_stack: text[] (default: '{}'),

  evaluation: jsonb (default: '{}'),
    -- { autoScore, manualScore, plagiarismScore, criteriaScores: [{ criteriaTitle, score, weight }], finalScore }

  review_status: text (default: 'PENDING'),
    -- CHECK: review_status IN ('PENDING', 'UNDER_REVIEW', 'REVIEWED', 'FLAGGED')

  submitted_at: timestamptz (nullable),
  updated_at: timestamptz (default: now())
}
```

---

## 10. Interviews (`interviews`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  application_id: UUID (required, FK → applications.id),
  company_id: UUID (nullable, FK → companies.id),

  rounds: jsonb (default: '[]'),
    -- Array of:
    -- {
    --   roundNumber: number,
    --   type: "SCREENING"|"HR"|"TECHNICAL"|"CASE_STUDY"|"ASSIGNMENT_REVIEW"|"PORTFOLIO_REVIEW"|"MANAGERIAL"|"BEHAVIORAL"|"FINAL"|"OTHER",
    --   scheduledAt: timestamptz,
    --   durationMinutes: number,
    --   mode: "ONLINE"|"OFFLINE",
    --   meetingLink: string,
    --   status: "SCHEDULED"|"COMPLETED"|"CANCELLED"|"NO_SHOW",
    --   feedback: string,
    --   rating: number (0-10),
    --   evaluatedAt: timestamptz
    -- }

  final_decision: text (nullable),
    -- CHECK: final_decision IN ('SELECTED', 'REJECTED', 'ON_HOLD')

  final_remarks: text (nullable),

  decision_by: UUID (nullable, FK → admins.id),

  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

---

## 11. Subscriptions (`subscriptions`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  company_id: UUID (required, FK → companies.id),

  plan_id: UUID (required, FK → plans.id),

  status: text (required),
    -- CHECK: status IN ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PAUSED')

  billing_cycle: text (nullable),
    -- CHECK: billing_cycle IN ('MONTHLY', 'YEARLY')

  price_at_purchase: numeric (nullable),

  valid_from: timestamptz (nullable),
  valid_to: timestamptz (nullable),

  auto_renew: boolean (default: false),

  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

**Foreign Keys Referencing This Table:**

- `companies.subscription_id` → `subscriptions.id`
- `payments.subscription_id` → `subscriptions.id`

---

## 12. Plans (`plans`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  name: text (required, unique),
    -- CHECK: name IN ('STARTER', 'GROWTH', 'ELITE')

  description: text (nullable),

  price_monthly: numeric (nullable),
  price_yearly: numeric (nullable),

  features: jsonb (default: '{}'),
    -- Structure:
    -- {
    --   competitions: { maxCompetitionsPerMonth, maxActiveCompetitions, maxApplicationsPerCompetition, maxShortlistedPerCompetition },
    --   interviews: { enabled, maxRoundsPerApplication },
    --   analytics: { advancedAnalytics, leaderboardAccess },
    --   branding: { brandingCustomization },
    --   ai: { chatbotSupport },
    --   messaging: { enabled, unlockStage: "NONE"|"SUBMITTED"|"SHORTLISTED", maxActiveChats, allowFileSharing, maxAttachmentSizeMB },
    --   support: { prioritySupport }
    -- }

  is_active: boolean (default: true),

  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

**Foreign Keys Referencing This Table:**

- `subscriptions.plan_id` → `plans.id`
- `payments.plan_id` → `plans.id`

---

## 13. Payments (`payments`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  company_id: UUID (required, FK → companies.id),
  subscription_id: UUID (required, FK → subscriptions.id),
  plan_id: UUID (nullable, FK → plans.id),

  billing_cycle: text (nullable),
    -- CHECK: billing_cycle IN ('MONTHLY', 'YEARLY')

  amount: numeric (required),

  currency: text (default: 'INR'),

  payment_type: text (nullable),
    -- CHECK: payment_type IN ('NEW_SUBSCRIPTION', 'RENEWAL', 'UPGRADE', 'DOWNGRADE')

  gateway: text (nullable),
    -- CHECK: gateway IN ('STRIPE', 'RAZORPAY', 'PAYPAL', 'OTHER')

  gateway_transaction_id: text (nullable),

  status: text (default: 'PENDING'),
    -- CHECK: status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')

  failure_reason: text (nullable),
  invoice_number: text (nullable),
  paid_at: timestamptz (nullable),

  metadata: jsonb (default: '{}'),
    -- Store raw gateway response if needed

  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

---

## 14. Chats (`chats`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  application_id: UUID (required, unique, FK → applications.id),
    -- One chat per application

  company_id: UUID (required, FK → companies.id),
  candidate_id: UUID (required, FK → users.id),

  is_locked: boolean (default: false),
    -- Lock if subscription expires

  last_message: text (nullable),
    -- For fast chat list preview

  last_message_at: timestamptz (nullable),

  unread_count: jsonb (default: '{"company": 0, "candidate": 0}'),

  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

**Foreign Keys Referencing This Table:**

- `messages.chat_id` → `chats.id`

---

## 15. Messages (`messages`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  chat_id: UUID (required, FK → chats.id),
  sender_id: UUID (required, FK → users.id),

  sender_role: text (nullable),
    -- CHECK: sender_role IN ('COMPANY', 'CANDIDATE')

  message_type: text (default: 'TEXT'),
    -- CHECK: message_type IN ('TEXT', 'FILE', 'SYSTEM')

  content: text (nullable),

  attachments: jsonb (default: '[]'),
    -- Array of { fileName, fileUrl, sizeMB }

  is_edited: boolean (default: false),
  is_deleted: boolean (default: false),

  read_by: jsonb (default: '[]'),
    -- Array of { userId, readAt }

  sent_at: timestamptz (default: now())
}
```

---

## 16. System Settings (`system_settings`)

Stores global platform configuration, feature flags, and orchestration limits managed by super admins.

```sql
{
  id: text (PK, default: 'system_settings'),
    -- Typically 'global' for the single active configuration row

  platform: jsonb (default: '{}'),
    -- e.g., maintenance_mode, registration_enabled
  features: jsonb (default: '{}'),
    -- e.g., ai_features_enabled
  competitions: jsonb (default: '{}'),
    -- Competition-specific global flags
  evaluation: jsonb (default: '{}'),
    -- Global evaluation thresholds
  ranking: jsonb (default: '{}'),
    -- Ranking algorithms configs
  security: jsonb (default: '{}'),
    -- e.g., defcon_status, emergency active flags
  limits: jsonb (default: '{}'),
    -- e.g., api_rate_limiting, max_concurrent_jobs
  billing: jsonb (default: '{}'),
    -- Payment gateway flags
  notifications: jsonb (default: '{}'),
    -- Global push or email system status

  updated_by: UUID (nullable),
    -- Admin who last modified
  version: integer (default: 1),
    -- Config schema version tracking
  updated_at: timestamptz (default: now())
}
```

---

## 17. Notifications (`notifications`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  recipient_id: UUID (nullable, FK → users.id),

  recipient_role: text (nullable),
    -- CHECK: recipient_role IN ('CANDIDATE', 'COMPANY', 'ADMIN')

  type: text (required),
    -- CHECK: type IN ('APPLICATION_STATUS', 'NEW_MESSAGE', 'INTERVIEW_SCHEDULED', 'INTERVIEW_UPDATED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'SUBSCRIPTION_EXPIRING', 'COMPETITION_UPDATE', 'SYSTEM')

  title: text (nullable),
  message: text (nullable),

  entity_type: text (nullable),
    -- CHECK: entity_type IN ('APPLICATION', 'COMPETITION', 'INTERVIEW', 'PAYMENT', 'SUBSCRIPTION', 'CHAT')

  entity_id: UUID (nullable),

  priority: text (default: 'LOW'),
    -- CHECK: priority IN ('LOW', 'MEDIUM', 'HIGH')

  is_read: boolean (default: false),
  read_at: timestamptz (nullable),

  delivery_channels: jsonb (default: '{"inApp": true, "email": false, "push": false}'),

  is_deleted: boolean (default: false),

  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

---

## 18. Activity Logs (`activity_logs`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  actor_id: UUID (nullable),

  actor_role: text (nullable),
    -- CHECK: actor_role IN ('CANDIDATE', 'COMPANY', 'ADMIN', 'SUPER_ADMIN', 'SYSTEM')

  action: text (required),
    -- CHECK: action IN (
    --   -- AUTH
    --   'AUTH_LOGIN', 'AUTH_LOGOUT', 'AUTH_PASSWORD_RESET', 'AUTH_ACCOUNT_LOCK',
    --   -- COMPETITION
    --   'COMPETITION_CREATE', 'COMPETITION_UPDATE', 'COMPETITION_DELETE', 'COMPETITION_PUBLISH', 'COMPETITION_CANCEL',
    --   -- APPLICATION
    --   'APPLICATION_APPLY', 'APPLICATION_WITHDRAW', 'APPLICATION_SHORTLIST', 'APPLICATION_REJECT', 'APPLICATION_SELECT', 'APPLICATION_STATUS_OVERRIDE',
    --   -- PROJECT
    --   'PROJECT_SUBMIT', 'PROJECT_UPDATE', 'PROJECT_EVALUATE', 'PROJECT_EVALUATION_OVERRIDE',
    --   -- INTERVIEW
    --   'INTERVIEW_SCHEDULE', 'INTERVIEW_UPDATE', 'INTERVIEW_CANCEL', 'INTERVIEW_COMPLETE',
    --   -- CHAT & MESSAGING
    --   'CHAT_CREATE', 'CHAT_LOCK', 'CHAT_UNLOCK', 'CHAT_DELETE', 'CHAT_MESSAGE_SEND', 'CHAT_MESSAGE_EDIT', 'CHAT_MESSAGE_DELETE', 'CHAT_ATTACHMENT_UPLOAD', 'CHAT_MARK_AS_READ',
    --   -- BILLING & SUBSCRIPTION
    --   'PAYMENT_CREATE', 'PAYMENT_FAIL', 'PAYMENT_REFUND', 'SUBSCRIPTION_CREATE', 'SUBSCRIPTION_UPDATE', 'SUBSCRIPTION_CANCEL',
    --   -- COMPANY (Admin-controlled)
    --   'COMPANY_APPROVE', 'COMPANY_REJECT', 'COMPANY_SUSPEND', 'COMPANY_RESTORE', 'COMPANY_UPDATE', 'COMPANY_DELETE',
    --   -- CANDIDATE (Admin-controlled)
    --   'CANDIDATE_SUSPEND', 'CANDIDATE_DELETE',
    --   -- ADMIN MANAGEMENT
    --   'ADMIN_CREATE', 'ADMIN_UPDATE', 'ADMIN_DELETE', 'ADMIN_ROLE_ASSIGN',
    --   -- ANALYTICS
    --   'ANALYTICS_VIEW_GENERAL', 'ANALYTICS_VIEW_FINANCIAL',
    --   -- PLAN & SYSTEM SETTINGS
    --   'PLAN_CREATE', 'PLAN_UPDATE', 'PLAN_DELETE', 'SYSTEM_SETTINGS_UPDATE',
    --   -- SYSTEM AUTOMATIONS
    --   'SYSTEM_AUTO_SHORTLIST', 'SYSTEM_GENERATE_RANKING', 'SYSTEM_AUTO_RENEW_SUBSCRIPTION'
    -- )

  entity_type: text (nullable),
    -- CHECK: entity_type IN ('USER', 'COMPANY', 'COMPETITION', 'APPLICATION', 'PROJECT', 'INTERVIEW', 'CHAT', 'MESSAGE', 'SUBSCRIPTION', 'PAYMENT', 'PLAN', 'SYSTEM_SETTINGS', 'ROLE')

  entity_id: UUID (nullable),

  metadata: jsonb (default: '{}'),

  severity: text (default: 'INFO'),
    -- CHECK: severity IN ('INFO', 'WARNING', 'CRITICAL')

  ip_address: text (nullable),
  user_agent: text (nullable),
  correlation_id: text (nullable),

  created_at: timestamptz (default: now())
}
```

> **Note:** `activity_logs` has no `updated_at` — logs are immutable.

---

## 19. Testimonials (`testimonials`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  source_type: text (required),
    -- CHECK: source_type IN ('USER_SUBMITTED', 'ADMIN_CREATED')

  author: jsonb (default: '{}'),
    -- { id: UUID|null, role: "CANDIDATE"|"COMPANY"|"EXTERNAL", nameSnapshot, designationSnapshot, companySnapshot }

  content: text (nullable),

  rating: integer (nullable),
    -- CHECK: rating >= 1 AND rating <= 5

  status: text (default: 'PENDING'),
    -- CHECK: status IN ('PENDING', 'APPROVED', 'REJECTED')

  rejection_reason: text (nullable),

  is_featured: boolean (default: false),
  display_order: integer (default: 0),
  is_deleted: boolean (default: false),
  view_count: integer (default: 0),

  moderation: jsonb (default: '{}'),
    -- { approvedBy: UUID, approvedAt: timestamptz }

  created_by: UUID (nullable),
    -- who created this record (user or admin)

  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

---

## 20. FAQs (`faqs`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  source_type: text (required),
    -- CHECK: source_type IN ('ADMIN_CREATED', 'COMPANY_CREATED')

  scope: text (required),
    -- CHECK: scope IN ('GLOBAL', 'COMPANY', 'COMPETITION')

  scope_id: UUID (nullable),
    -- null if GLOBAL, companyId if COMPANY, competitionId if COMPETITION

  question: text (nullable),
  answer: text (nullable),

  slug: text (nullable),
    -- only required unique for GLOBAL FAQs

  category: text (nullable),
    -- CHECK: category IN ('GENERAL', 'CANDIDATE', 'COMPANY', 'PRICING', 'TECHNICAL', 'COMPETITION_SPECIFIC')

  tags: text[] (default: '{}'),

  display_order: integer (default: 0),
  is_featured: boolean (default: false),

  status: text (default: 'DRAFT'),
    -- CHECK: status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')

  is_deleted: boolean (default: false),
  view_count: integer (default: 0),

  moderation: jsonb (default: '{}'),
    -- { approvedBy: UUID, approvedAt: timestamptz }

  created_by: UUID (nullable, FK → admins.id),
  updated_by: UUID (nullable, FK → admins.id),

  published_at: timestamptz (nullable),

  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

---

## 21. Analytics (`analytics`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  date: date (required, unique),

  users: jsonb (default: '{}'),
    -- { total, new, active, candidates, companies }

  competitions: jsonb (default: '{}'),
    -- { total, new, active, completed }

  applications: jsonb (default: '{}'),
    -- { total, new, shortlisted, selected }

  projects: jsonb (default: '{}'),
    -- { submitted, evaluated, avgScore }

  interviews: jsonb (default: '{}'),
    -- { scheduled, completed }

  subscriptions: jsonb (default: '{}'),
    -- { active, new, cancelled, churnRate }

  revenue: jsonb (default: '{}'),
    -- { daily, monthlyRecurring (MRR), yearlyRecurring (ARR) }

  hiring_metrics: jsonb (default: '{}'),
    -- { avgTimeToHireDays, hireConversionRate, shortlistRate }

  engagement: jsonb (default: '{}'),
    -- { messagesSent, activeChats }

  created_at: timestamptz (default: now())
}
```

> **Note:** `analytics` has no `updated_at` — daily snapshots are immutable.

---

## 22. AI Chats (`ai_chats`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  user_id: UUID (nullable, FK → users.id),

  user_type: text (nullable),
    -- CHECK: user_type IN ('CANDIDATE', 'COMPANY')

  company_id: UUID (nullable, FK → companies.id),
  candidate_id: UUID (nullable, FK → users.id),

  title: text (nullable),

  context_type: text (nullable),
    -- CHECK: context_type IN ('GENERAL', 'JOB_ASSISTANT', 'PROJECT_REVIEW', 'INTERVIEW_PREP', 'RESUME_HELP', 'PERFORMANCE_ANALYSIS')

  related_entity: jsonb (default: '{}'),
    -- { entityType: "JOB"|"PROJECT"|"COMPETITION"|null, entityId: UUID }

  model: jsonb (default: '{}'),
    -- { provider, modelName }

  plan_snapshot: jsonb (default: '{}'),
    -- { planId, planName }

  usage: jsonb (default: '{"totalMessages": 0, "totalTokensUsed": 0, "totalCost": 0}'),

  last_message_at: timestamptz (nullable),

  is_archived: boolean (default: false),
  is_deleted: boolean (default: false),

  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

**Foreign Keys Referencing This Table:**

- `ai_messages.chat_id` → `ai_chats.id`

---

## 23. AI Messages (`ai_messages`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  chat_id: UUID (required, FK → ai_chats.id),

  sender_role: text (nullable),
    -- CHECK: sender_role IN ('USER', 'ASSISTANT', 'SYSTEM')

  content: text (nullable),

  token_usage: jsonb (default: '{}'),
    -- { promptTokens, completionTokens, totalTokens }

  response_time_ms: integer (nullable),

  model_used: text (nullable),

  created_at: timestamptz (default: now())
}
```

---

## 24. AI Rate Limits (`ai_rate_limits`)

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  user_id: UUID (required, unique, FK → users.id),

  user_type: text (nullable),
    -- CHECK: user_type IN ('CANDIDATE', 'COMPANY')

  daily_message_count: integer (default: 0),
  monthly_token_usage: integer (default: 0),

  last_daily_reset_at: timestamptz (nullable),
  last_monthly_reset_at: timestamptz (nullable),

  plan_snapshot: jsonb (default: '{}'),
    -- { planId, dailyLimit, monthlyTokenLimit }

  created_at: timestamptz (default: now())
}
```

---

## 25. Automation Workflows (`automation_workflows`)

```sql
{
  id: UUID (PK, default: gen_random_uuid()),

  name: varchar (required),
  description: text (nullable),

  trigger_type: varchar (required),
    -- e.g. "event", "schedule", "manual"

  trigger_config: jsonb (default: '{}'),
  actions: jsonb (default: '[]'),
  is_active: boolean (default: false),

  created_by: UUID (nullable, FK → admins.id),

  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```

**Foreign Keys Referencing This Table:**

- `automation_history.workflow_id` → `automation_workflows.id`

---

## 26. Automation History (`automation_history`)

```sql
{
  id: UUID (PK, default: gen_random_uuid()),

  workflow_id: UUID (nullable, FK → automation_workflows.id),

  triggered_by: UUID (nullable),
    -- Can be user, admin, or null (system)

  status: varchar (required),
    -- e.g. "success", "failed", "running"

  started_at: timestamptz (default: now()),
  completed_at: timestamptz (nullable),

  execution_logs: jsonb (default: '[]'),

  created_at: timestamptz (default: now())
}
```

---

## 27. OTPs (`otps`)

> **NEW TABLE** — Not previously documented. Used for email verification, password resets, and two-factor authentication.

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  user_id: UUID (nullable, FK → users.id),
  email: text (nullable),

  otp_hash: text (required),
    -- Hashed OTP value for security

  purpose: text (required),
    -- CHECK: purpose IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'TWO_FA_LOGIN')

  attempts: integer (default: 0),
  max_attempts: integer (default: 5),

  request_ip: text (nullable),

  is_used: boolean (default: false),

  expires_at: timestamptz (required),
  created_at: timestamptz (default: now())
}
```

---

## 28. Contact Messages (`contact_messages`)

> **NEW TABLE** — Not previously documented. Support ticket system for user inquiries and issue reporting.

```sql
{
  id: UUID (PK, default: uuid_generate_v4()),

  ticket_number: text (nullable),
    -- Auto-generated unique ticket reference

  sender_id: UUID (nullable, FK → users.id),

  category: text (nullable),
    -- CHECK: category IN ('ACCOUNT_ISSUE', 'PAYMENT_ISSUE', 'SUBSCRIPTION', 'COMPETITION_QUERY', 'TECHNICAL_BUG', 'INTERVIEW_ISSUE', 'GENERAL_INQUIRY')

  subject: text (nullable),
  description: text (nullable),

  attachments: jsonb (default: '[]'),
    -- Array of { fileName, fileUrl, sizeMB }

  status: text (default: 'OPEN'),
    -- CHECK: status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')

  priority: text (default: 'MEDIUM'),
    -- CHECK: priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')

  assigned_to: UUID (nullable, FK → admins.id),

  related_entity: jsonb (default: '{}'),
    -- { entityType, entityId } — links to related competition, payment, etc.

  resolved_at: timestamptz (nullable),

  created_at: timestamptz (default: now()),
  updated_at: timestamptz (default: now())
}
```
