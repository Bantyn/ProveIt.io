import { Routes } from '@angular/router';

export const routes: Routes = [
  // ── Public Pages ──────────────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () => import('./features/pages/landing/landing').then((l) => l.Landing),
  },
  { path: 'home', loadComponent: () => import('./features/pages/home/home').then((l) => l.Home) },
  {
    path: 'auth',
    loadComponent: () => import('./features/pages/auth-page/auth-page').then((l) => l.AuthPage),
  },
  {
    path: 'user/company',
    loadComponent: () => import('./features/pages/company/company').then((l) => l.Company),
  },
  {
    path: 'user/profile',
    loadComponent: () =>
      import('./features/pages/user-profile/user-profile').then((l) => l.UserProfile),
  },
  {
    path: 'user/company/:id',
    loadComponent: () =>
      import('./features/pages/company-details/company-details').then((l) => l.CompanyDetails),
  },
  {
    path: 'user/applications',
    loadComponent: () =>
      import('./features/pages/user-applications/user-applications').then(
        (l) => l.UserApplications,
      ),
  },
  {
    path: 'user/compition/:id/submit',
    loadComponent: () =>
      import('./features/pages/project-submission/project-submission').then(
        (l) => l.ProjectSubmission,
      ),
  },
  {
    path: 'user/compition',
    loadComponent: () => import('./features/pages/compition/compition').then((l) => l.Compition),
  },
  {
    path: 'user/compition/:id',
    loadComponent: () =>
      import('./features/pages/competition-details/competition-details').then(
        (l) => l.CompetitionDetails,
      ),
  },
  {
    path: 'pricing',
    loadComponent: () => import('./features/pages/pricing/pricing').then((l) => l.Pricing),
  },
  {
    path: 'about',
    loadComponent: () => import('./features/pages/about/about').then((l) => l.About),
  },
  {
    path: 'leader',
    loadComponent: () => import('./features/pages/leader/leader').then((l) => l.LeaderPage),
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/pages/feedback/feedback').then((l) => l.Feedback),
  },
  {
    path: 'maintenance',
    loadComponent: () =>
      import('./features/pages/admin-dashboard/maintenance/maintenance').then(
        (m) => m.AdminMaintenance,
      ),
  },
  {
    path: 'support',
    loadComponent: () => import('./features/pages/support/support').then((l) => l.Support),
  },

  {
    path: 'user/applications/:id/details',
    loadComponent: () =>
      import('./features/pages/application-details/application-details').then(
        (l) => l.ApplicationDetails,
      ),
  },

  // ── Company Dashboard ────────────────────────────────────────────────────
  {
    path: 'company/dashboard',
    loadComponent: () =>
      import('./features/pages/company-dashboard/shell/shell').then((m) => m.CompanyShell),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/pages/company-dashboard/home/home').then((m) => m.CompanyHome),
      },
      {
        path: 'competitions',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/pages/company-dashboard/competitions/competitions').then(
                (m) => m.CompanyCompetitions,
              ),
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./features/pages/company-dashboard/competitions/create-competition/create-competition').then(
                (m) => m.CreateCompetition,
              ),
          },
          {
            path: 'edit/:id',
            loadComponent: () =>
              import('./features/pages/company-dashboard/competitions/create-competition/create-competition').then(
                (m) => m.CreateCompetition,
              ),
          },
        ],
      },
      {
        path: 'applications',
        loadComponent: () =>
          import('./features/pages/company-dashboard/applications/applications').then(
            (m) => m.CompanyApplications,
          ),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./features/pages/company-dashboard/projects/projects').then(
            (m) => m.CompanyProjects,
          ),
      },
      {
        path: 'pipeline',
        loadComponent: () =>
          import('./features/pages/company-dashboard/hiring-pipeline/hiring-pipeline').then(
            (m) => m.HiringPipeline,
          ),
      },
      {
        path: 'interviews',
        loadComponent: () =>
          import('./features/pages/company-dashboard/interviews/interviews').then(
            (m) => m.CompanyInterviews,
          ),
      },

      {
        path: 'billing',
        loadComponent: () =>
          import('./features/pages/company-dashboard/billing/billing').then(
            (m) => m.CompanyBilling,
          ),
      },
      {
        path: 'payment-history',
        loadComponent: () =>
          import('./features/pages/company-dashboard/payment-history/payment-history').then(
            (m) => m.CompanyPaymentHistory,
          ),
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('./features/pages/company-dashboard/reviews/reviews').then(
            (m) => m.CompanyReviews,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/pages/company-dashboard/settings/settings').then(
            (m) => m.CompanySettings,
          ),
      },
    ],
  },

  // ── Admin    Dashboard ────────────────────────────────────────
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/pages/admin-dashboard/shell/shell').then((m) => m.AdminShell),
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./features/pages/admin-dashboard/overview/overview').then((m) => m.AdminOverview),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/pages/admin-dashboard/users/users').then((m) => m.AdminUsers),
      },
      {
        path: 'companies',
        loadComponent: () =>
          import('./features/pages/admin-dashboard/companies/companies').then(
            (m) => m.AdminCompanies,
          ),
      },
      {
        path: 'competitions',
        loadComponent: () =>
          import('./features/pages/admin-dashboard/competitions/competitions').then(
            (m) => m.AdminCompetitions,
          ),
      },
      {
        path: 'applications',
        loadComponent: () =>
          import('./features/pages/admin-dashboard/applications/applications').then(
            (m) => m.AdminApplications,
          ),
      },
      {
        path: 'plans',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/pages/admin-dashboard/billing/billing').then(
                (m) => m.AdminBilling,
              ),
          },
          {
            path: 'edit/:id',
            loadComponent: () =>
              import('./features/pages/admin-dashboard/plans/edit-plan/edit-plan').then(
                (m) => m.EditPlan,
              ),
          },
        ],
      },
      {
        path: 'revenue',
        loadComponent: () =>
          import('./features/pages/admin-dashboard/revenue/revenue').then(
            (m) => m.AdminRevenue,
          ),
      },
      {
        path: 'logs',
        loadComponent: () =>
          import('./features/pages/admin-dashboard/logs/logs').then((m) => m.AdminLogs),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/pages/admin-dashboard/notifications/notifications').then(
            (m) => m.AdminNotifications,
          ),
      },
      {
        path: 'ai-config',
        loadComponent: () =>
          import('./features/pages/admin-dashboard/ai-config/ai-config').then(
            (m) => m.AdminAiConfig,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/pages/admin-dashboard/settings/settings').then((m) => m.AdminSettings),
      },
      {
        path: 'support',
        loadComponent: () =>
          import('./features/pages/admin-dashboard/support/support').then((m) => m.AdminSupport),
      },
      {
        path: 'faq-testimonials',
        loadComponent: () =>
          import('./features/pages/admin-dashboard/faq-testimonials/faq-testimonials').then(
            (m) => m.AdminFaqTestimonials,
          ),
      },
      {
        path: 'roles',
        loadComponent: () =>
          import('./features/pages/admin-dashboard/roles/roles').then((m) => m.AdminRoles),
      },
      {
        path: 'maintenance',
        loadComponent: () =>
          import('./features/pages/admin-dashboard/maintenance/maintenance').then(
            (m) => m.AdminMaintenance,
          ),
      },
    ],
  },

  // ── Catch-all ─────────────────────────────────────────────────────────────
  {
    path: '**',
    loadComponent: () => import('./features/pages/not-found/not-found').then((l) => l.NotFound),
  },
];
