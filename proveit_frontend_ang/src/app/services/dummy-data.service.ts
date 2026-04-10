import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DummyDataService {
  // ─── USERS ────────────────────────────────────────────────────────────────
  users = [
    {
      id: 'u1',
      name: 'Arjun Mehta',
      email: 'arjun@email.com',
      role: 'candidate',
      status: 'active',
      createdAt: '2025-01-10',
      avatar: 'AM',
    },
    {
      id: 'u2',
      name: 'Priya Sharma',
      email: 'priya@email.com',
      role: 'candidate',
      status: 'active',
      createdAt: '2025-01-15',
      avatar: 'PS',
    },
    {
      id: 'u3',
      name: 'Ravi Kumar',
      email: 'ravi@email.com',
      role: 'candidate',
      status: 'suspended',
      createdAt: '2025-02-01',
      avatar: 'RK',
    },
    {
      id: 'u4',
      name: 'Sneha Patel',
      email: 'sneha@email.com',
      role: 'candidate',
      status: 'active',
      createdAt: '2025-02-10',
      avatar: 'SP',
    },
    {
      id: 'u5',
      name: 'Vikram Singh',
      email: 'vikram@email.com',
      role: 'company',
      status: 'active',
      createdAt: '2025-01-05',
      avatar: 'VS',
    },
    {
      id: 'u6',
      name: 'Admin User',
      email: 'admin@proveit.io',
      role: 'admin',
      status: 'active',
      createdAt: '2024-12-01',
      avatar: 'AU',
    },
    {
      id: 'u7',
      name: 'Divya Nair',
      email: 'divya@email.com',
      role: 'candidate',
      status: 'blocked',
      createdAt: '2025-03-01',
      avatar: 'DN',
    },
    {
      id: 'u8',
      name: 'Karan Joshi',
      email: 'karan@email.com',
      role: 'candidate',
      status: 'active',
      createdAt: '2025-03-05',
      avatar: 'KJ',
    },
  ];

  // ─── COMPANIES ────────────────────────────────────────────────────────────
  companies = [
    {
      id: 'c1',
      name: 'TechNova Pvt Ltd',
      email: 'hr@technova.com',
      industry: 'Technology',
      status: 'verified',
      plan: 'Enterprise',
      employees: 250,
      createdAt: '2025-01-08',
    },
    {
      id: 'c2',
      name: 'DataSphere Inc',
      email: 'hr@datasphere.io',
      industry: 'Analytics',
      status: 'pending',
      plan: 'Growth',
      employees: 80,
      createdAt: '2025-02-12',
    },
    {
      id: 'c3',
      name: 'FinEdge Solutions',
      email: 'jobs@finedge.com',
      industry: 'FinTech',
      status: 'verified',
      plan: 'Enterprise',
      employees: 150,
      createdAt: '2025-01-20',
    },
    {
      id: 'c4',
      name: 'HealthBridge Ltd',
      email: 'hr@healthbridge.in',
      industry: 'HealthTech',
      status: 'suspended',
      plan: 'Starter',
      employees: 40,
      createdAt: '2025-03-01',
    },
    {
      id: 'c5',
      name: 'EduUp Technologies',
      email: 'hr@eduup.in',
      industry: 'EdTech',
      status: 'pending',
      plan: 'Growth',
      employees: 60,
      createdAt: '2025-03-10',
    },
  ];

  // ─── COMPETITIONS ─────────────────────────────────────────────────────────
  competitions = [
    {
      id: 'comp1',
      companyId: 'c1',
      title: 'Frontend Challenge – React',
      skills: ['React', 'TypeScript', 'CSS'],
      status: 'active',
      deadline: '2025-04-15',
      prize: '₹50,000',
      applicants: 120,
      postedAt: '2025-03-01',
    },
    {
      id: 'comp2',
      companyId: 'c1',
      title: 'ML Pipeline Design Challenge',
      skills: ['Python', 'TensorFlow', 'SQL'],
      status: 'active',
      deadline: '2025-04-20',
      prize: '₹75,000',
      applicants: 85,
      postedAt: '2025-03-05',
    },
    {
      id: 'comp3',
      companyId: 'c1',
      title: 'Backend API Architect',
      skills: ['Node.js', 'MongoDB', 'Docker'],
      status: 'draft',
      deadline: '2025-05-01',
      prize: '₹60,000',
      applicants: 0,
      postedAt: '2025-03-10',
    },
    {
      id: 'comp4',
      companyId: 'c3',
      title: 'FinTech Security Audit Challenge',
      skills: ['Security', 'Java', 'AWS'],
      status: 'completed',
      deadline: '2025-02-28',
      prize: '₹1,00,000',
      applicants: 200,
      postedAt: '2025-01-15',
    },
    {
      id: 'comp5',
      companyId: 'c2',
      title: 'Data Visualization Sprint',
      skills: ['D3.js', 'Python', 'Tableau'],
      status: 'cancelled',
      deadline: '2025-03-20',
      prize: '₹30,000',
      applicants: 45,
      postedAt: '2025-02-20',
    },
  ];

  // ─── APPLICATIONS ─────────────────────────────────────────────────────────
  applications = [
    {
      id: 'app1',
      competitionId: 'comp1',
      userId: 'u1',
      candidateName: 'Arjun Mehta',
      score: 92,
      rank: 1,
      status: 'shortlisted',
      submittedAt: '2025-03-10',
    },
    {
      id: 'app2',
      competitionId: 'comp1',
      userId: 'u2',
      candidateName: 'Priya Sharma',
      score: 87,
      rank: 2,
      status: 'under_review',
      submittedAt: '2025-03-11',
    },
    {
      id: 'app3',
      competitionId: 'comp1',
      userId: 'u4',
      candidateName: 'Sneha Patel',
      score: 78,
      rank: 3,
      status: 'under_review',
      submittedAt: '2025-03-12',
    },
    {
      id: 'app4',
      competitionId: 'comp2',
      userId: 'u8',
      candidateName: 'Karan Joshi',
      score: 95,
      rank: 1,
      status: 'shortlisted',
      submittedAt: '2025-03-14',
    },
    {
      id: 'app5',
      competitionId: 'comp4',
      userId: 'u1',
      candidateName: 'Arjun Mehta',
      score: 88,
      rank: 2,
      status: 'rejected',
      submittedAt: '2025-02-10',
    },
    {
      id: 'app6',
      competitionId: 'comp4',
      userId: 'u2',
      candidateName: 'Priya Sharma',
      score: 91,
      rank: 1,
      status: 'hired',
      submittedAt: '2025-02-11',
    },
  ];

  // ─── PROJECTS ─────────────────────────────────────────────────────────────
  projects = [
    {
      id: 'prj1',
      applicationId: 'app1',
      title: 'Portfolio Dashboard – React',
      repoUrl: 'https://github.com/arjun/portfolio',
      aiScore: 88,
      plagiarism: '2%',
      status: 'reviewed',
      submittedAt: '2025-03-10',
    },
    {
      id: 'prj2',
      applicationId: 'app2',
      title: 'E-Commerce UI Component Lib',
      repoUrl: 'https://github.com/priya/ecomui',
      aiScore: 82,
      plagiarism: '0%',
      status: 'pending',
      submittedAt: '2025-03-11',
    },
    {
      id: 'prj3',
      applicationId: 'app4',
      title: 'NLP Text Classifier Pipeline',
      repoUrl: 'https://github.com/karan/nlp',
      aiScore: 94,
      plagiarism: '1%',
      status: 'reviewed',
      submittedAt: '2025-03-14',
    },
    {
      id: 'prj4',
      applicationId: 'app3',
      title: 'Real-Time Chat App',
      repoUrl: 'https://github.com/sneha/chat',
      aiScore: 75,
      plagiarism: '5%',
      status: 'flagged',
      submittedAt: '2025-03-12',
    },
  ];

  // ─── INTERVIEWS ───────────────────────────────────────────────────────────
  interviews = [
    {
      id: 'int1',
      applicationId: 'app1',
      candidateName: 'Arjun Mehta',
      date: '2025-04-02',
      time: '10:00 AM',
      type: 'Technical',
      status: 'scheduled',
      decision: null,
    },
    {
      id: 'int2',
      applicationId: 'app4',
      candidateName: 'Karan Joshi',
      date: '2025-04-03',
      time: '02:00 PM',
      type: 'HR',
      status: 'scheduled',
      decision: null,
    },
    {
      id: 'int3',
      applicationId: 'app6',
      candidateName: 'Priya Sharma',
      date: '2025-02-20',
      time: '11:00 AM',
      type: 'Technical',
      status: 'completed',
      decision: 'hired',
    },
  ];

  // ─── CHATS ────────────────────────────────────────────────────────────────
  chats = [
    {
      id: 'ch1',
      applicationId: 'app1',
      candidateName: 'Arjun Mehta',
      lastMessage: 'Looking forward to the interview!',
      unread: 2,
      updatedAt: '2025-03-15',
    },
    {
      id: 'ch2',
      applicationId: 'app4',
      candidateName: 'Karan Joshi',
      lastMessage: 'Can we reschedule the interview?',
      unread: 1,
      updatedAt: '2025-03-14',
    },
    {
      id: 'ch3',
      applicationId: 'app2',
      candidateName: 'Priya Sharma',
      lastMessage: 'Thank you for the opportunity.',
      unread: 0,
      updatedAt: '2025-03-13',
    },
  ];

  messages = [
    {
      id: 'm1',
      chatId: 'ch1',
      sender: 'candidate',
      text: 'Hello, just submitted my project!',
      time: '10:00',
    },
    {
      id: 'm2',
      chatId: 'ch1',
      sender: 'company',
      text: 'Great! We will review it soon.',
      time: '10:05',
    },
    {
      id: 'm3',
      chatId: 'ch1',
      sender: 'candidate',
      text: 'Looking forward to the interview!',
      time: '10:10',
    },
    {
      id: 'm4',
      chatId: 'ch2',
      sender: 'candidate',
      text: 'Can we reschedule the interview?',
      time: '14:00',
    },
    {
      id: 'm5',
      chatId: 'ch2',
      sender: 'company',
      text: 'Sure, which date works for you?',
      time: '14:30',
    },
  ];

  // ─── PLANS ────────────────────────────────────────────────────────────────
  plans = [
    {
      id: 'pl1',
      name: 'Starter',
      price: 0,
      currency: 'INR',
      competitions: 5,
      features: [
        '5 Competitions / Month',
        'Basic Analytics',
        'Email Support',
        'Standard Applications',
        'Community Access',
      ],
      popular: false,
    },
    {
      id: 'pl2',
      name: 'Growth',
      price: 499,
      monthlyPrice: 499,
      currency: 'INR',
      competitions: 25,
      features: [
        '25 Competitions / Month',
        'Advanced Analytics',
        'Messaging & Chat',
        'Priority Support',
        'Interview Scheduling',
        'Leaderboard Access',
      ],
      popular: true,
    },
    {
      id: 'pl3',
      name: 'Elite',
      price: 1299,
      monthlyPrice: 1299,
      currency: 'INR',
      competitions: 999, // unlimited
      features: [
        'Unlimited Competitions',
        'Custom Branding',
        'AI Chatbot Support',
        'Dedicated Support',
        'Full API Access',
        'Advanced AI Evaluation',
        'SLA Guarantee',
      ],
      popular: false,
    },
  ];

  // ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────
  subscriptions = [
    {
      id: 'sub1',
      companyId: 'c1',
      planId: 'pl3',
      status: 'active',
      startDate: '2025-01-08',
      endDate: '2025-02-08',
      amount: 1299,
    },
    {
      id: 'sub2',
      companyId: 'c2',
      planId: 'pl2',
      status: 'active',
      startDate: '2025-02-12',
      endDate: '2025-03-12',
      amount: 499,
    },
    {
      id: 'sub3',
      companyId: 'c3',
      planId: 'pl3',
      status: 'active',
      startDate: '2025-01-20',
      endDate: '2025-02-20',
      amount: 1299,
    },
    {
      id: 'sub4',
      companyId: 'c4',
      planId: 'pl1',
      status: 'suspended',
      startDate: '2025-03-01',
      endDate: '2025-04-01',
      amount: 0,
    },
  ];

  // ─── PAYMENTS ─────────────────────────────────────────────────────────────
  payments = [
    {
      id: 'pay1',
      companyId: 'c1',
      amount: 1299,
      currency: 'INR',
      status: 'success',
      method: 'UPI',
      description: 'Pro Plan – Jan 2025',
      date: '2025-01-08',
    },
    {
      id: 'pay2',
      companyId: 'c2',
      amount: 499,
      currency: 'INR',
      status: 'success',
      method: 'Card',
      description: 'Plus Plan – Feb 2025',
      date: '2025-02-12',
    },
    {
      id: 'pay3',
      companyId: 'c3',
      amount: 1299,
      currency: 'INR',
      status: 'success',
      method: 'Net Banking',
      description: 'Pro Plan – Jan 2025',
      date: '2025-01-20',
    },
    {
      id: 'pay4',
      companyId: 'c1',
      amount: 1299,
      currency: 'INR',
      status: 'refunded',
      method: 'UPI',
      description: 'Pro Plan Refund',
      date: '2024-12-20',
    },
  ];

  // ─── ANALYTICS ────────────────────────────────────────────────────────────
  analytics = {
    totalUsers: 4820,
    totalCompanies: 312,
    activeSubscriptions: 287,
    totalRevenue: 38_47_256,
    totalCompetitions: 1420,
    totalApplications: 52_300,
    avgScore: 76.4,
    revenueGrowth: 24,
    userGrowth: 18,
    monthlyRevenue: [
      { month: 'Sep', revenue: 2_80_000 },
      { month: 'Oct', revenue: 3_10_000 },
      { month: 'Nov', revenue: 2_95_000 },
      { month: 'Dec', revenue: 3_40_000 },
      { month: 'Jan', revenue: 3_80_000 },
      { month: 'Feb', revenue: 4_20_000 },
    ],
  };

  // ─── ACTIVITY LOGS ────────────────────────────────────────────────────────
  activityLogs = [
    {
      id: 'log1',
      action: 'User Registered',
      severity: 'info',
      userId: 'u8',
      description: 'Karan Joshi registered as candidate.',
      timestamp: '2025-03-05T10:32:00',
    },
    {
      id: 'log2',
      action: 'Competition Published',
      severity: 'info',
      userId: 'u5',
      description: 'TechNova published "Frontend Challenge – React".',
      timestamp: '2025-03-01T09:00:00',
    },
    {
      id: 'log3',
      action: 'User Suspended',
      severity: 'warning',
      userId: 'u6',
      description: 'Admin suspended Ravi Kumar for policy violation.',
      timestamp: '2025-02-28T14:10:00',
    },
    {
      id: 'log4',
      action: 'Payment Failed',
      severity: 'error',
      userId: 'u5',
      description: 'Payment of ₹12,999 failed for TechNova.',
      timestamp: '2025-02-25T16:45:00',
    },
    {
      id: 'log5',
      action: 'AI Rate Limit Exceeded',
      severity: 'warning',
      userId: 'u1',
      description: 'Arjun exceeded AI assistant rate limit (50/day).',
      timestamp: '2025-03-12T22:00:00',
    },
    {
      id: 'log6',
      action: 'Plagiarism Flag Raised',
      severity: 'error',
      userId: 'u4',
      description: 'Project "Real-Time Chat App" flagged for plagiarism.',
      timestamp: '2025-03-13T08:30:00',
    },
    {
      id: 'log7',
      action: 'Competition Cancelled',
      severity: 'info',
      userId: 'u5',
      description: 'DataSphere cancelled "Data Visualization Sprint".',
      timestamp: '2025-03-20T11:00:00',
    },
    {
      id: 'log8',
      action: 'Admin Login',
      severity: 'info',
      userId: 'u6',
      description: 'Admin logged in from IP 192.168.1.1.',
      timestamp: '2025-03-15T09:00:00',
    },
  ];

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  notifications = [
    {
      id: 'n1',
      title: 'New Company Registration',
      message: 'HealthBridge Ltd. registered and pending approval.',
      type: 'info',
      status: 'unread',
      createdAt: '2025-03-10',
    },
    {
      id: 'n2',
      title: 'Payment Received',
      message: '₹12,999 received from TechNova Pvt Ltd.',
      type: 'success',
      status: 'read',
      createdAt: '2025-03-08',
    },
    {
      id: 'n3',
      title: 'Plagiarism Alert',
      message: 'Project flagged for high plagiarism score (85%).',
      type: 'warning',
      status: 'unread',
      createdAt: '2025-03-13',
    },
    {
      id: 'n4',
      title: 'System Maintenance Due',
      message: 'Scheduled maintenance on 2025-04-01 at 2 AM.',
      type: 'warning',
      status: 'unread',
      createdAt: '2025-03-14',
    },
    {
      id: 'n5',
      title: 'AI Rate Limit Hit',
      message: '3 users hit the daily AI usage limit today.',
      type: 'error',
      status: 'read',
      createdAt: '2025-03-12',
    },
  ];

  // ─── AI RATE LIMITS ──────────────────────────────────────────────────────
  aiRateLimits = [
    {
      id: 'ai1',
      userId: 'u1',
      usageToday: 50,
      limitPerDay: 50,
      totalUsage: 1200,
      plan: 'Pro',
      status: 'limit_hit',
    },
    {
      id: 'ai2',
      userId: 'u2',
      usageToday: 30,
      limitPerDay: 50,
      totalUsage: 820,
      plan: 'Plus',
      status: 'normal',
    },
    {
      id: 'ai3',
      userId: 'u4',
      usageToday: 12,
      limitPerDay: 20,
      totalUsage: 320,
      plan: 'Free',
      status: 'normal',
    },
    {
      id: 'ai4',
      userId: 'u8',
      usageToday: 20,
      limitPerDay: 20,
      totalUsage: 500,
      plan: 'Free',
      status: 'limit_hit',
    },
  ];

  // ─── SYSTEM SETTINGS ─────────────────────────────────────────────────────
  systemSettings = {
    maintenanceMode: false,
    registrationOpen: true,
    aiAssistantEnabled: true,
    plagiarismCheckEnabled: true,
    maxFileUploadMB: 50,
    defaultPlan: 'Free',
    supportEmail: 'support@proveit.io',
    platformVersion: '2.1.4',
    featureFlags: {
      chatEnabled: true,
      aiCoach: true,
      videoInterviews: false,
      liveCompetitions: true,
    },
  };

  // ─── FAQS ─────────────────────────────────────────────────────────────────
  faqs = [
    {
      id: 'faq1',
      question: 'How does ProveIt.io work?',
      answer:
        'Companies post skill challenges; candidates submit projects to prove their skills. AI and admins evaluate submissions.',
      category: 'General',
      status: 'published',
    },
    {
      id: 'faq2',
      question: 'What is the subscription cost?',
      answer:
        'Plans start from Free and go up to Pro at ₹1,299/mo. Custom plans available for large enterprises.',
      category: 'Billing',
      status: 'published',
    },
    {
      id: 'faq3',
      question: 'Can candidates see company identities?',
      answer:
        'Yes, company names are visible. Candidate identities are shown only after shortlisting to prevent bias.',
      category: 'Privacy',
      status: 'published',
    },
    {
      id: 'faq4',
      question: 'How is plagiarism detected?',
      answer:
        'We use AI-powered code similarity analysis across all submissions in our platform and public GitHub repos.',
      category: 'Technical',
      status: 'draft',
    },
    {
      id: 'faq5',
      question: 'How do I upgrade my company plan?',
      answer:
        'Go to Company Dashboard → Billing & Subscription → Upgrade Plan, and choose a plan that suits your needs.',
      category: 'Billing',
      status: 'published',
    },
  ];

  // ─── TESTIMONIALS ─────────────────────────────────────────────────────────
  testimonials = [
    {
      id: 't1',
      name: 'Arjun Mehta',
      role: 'Software Engineer at TechNova',
      rating: 5,
      text: 'ProveIt.io helped me land my dream job! The challenge-based hiring is much fairer than traditional interviews.',
      status: 'published',
      avatar: 'AM',
    },
    {
      id: 't2',
      name: 'Priya Sharma',
      role: 'Data Analyst at FinEdge',
      rating: 5,
      text: 'I showcased my real skills through projects instead of cramming DSA. Got hired in 3 weeks!',
      status: 'published',
      avatar: 'PS',
    },
    {
      id: 't3',
      name: 'Vikram Singh',
      role: 'HR Manager at DataSphere',
      rating: 4,
      text: 'The quality of candidates we receive through ProveIt is exceptional. Highly recommend for technical hiring.',
      status: 'published',
      avatar: 'VS',
    },
    {
      id: 't4',
      name: 'Sneha Patel',
      role: 'Full Stack Developer',
      rating: 3,
      text: 'Good platform, but I wish they had more companies from Tier-2 cities.',
      status: 'draft',
      avatar: 'SP',
    },
  ];

  // ─── CONTACT MESSAGES ────────────────────────────────────────────────────
  contactMessages = [
    {
      id: 'cm1',
      name: 'Rahul Verma',
      email: 'rahul@email.com',
      subject: 'Billing Issue',
      message: 'I was charged twice for my Pro plan subscription.',
      status: 'open',
      priority: 'high',
      createdAt: '2025-03-10',
    },
    {
      id: 'cm2',
      name: 'Anjali Rao',
      email: 'anjali@email.com',
      subject: 'Competition Not Visible',
      message: 'The competition I applied for disappeared from my dashboard.',
      status: 'open',
      priority: 'medium',
      createdAt: '2025-03-12',
    },
    {
      id: 'cm3',
      name: 'Sameer Khan',
      email: 'sameer@email.com',
      subject: 'Account Suspended Query',
      message: 'My account was suspended without any warning. Please review.',
      status: 'resolved',
      priority: 'low',
      createdAt: '2025-03-05',
    },
    {
      id: 'cm4',
      name: 'TechNova HR',
      email: 'hr@technova.com',
      subject: 'Custom Plan Enquiry',
      message: 'We are interested in a custom enterprise plan. Please contact us.',
      status: 'open',
      priority: 'high',
      createdAt: '2025-03-14',
    },
  ];

  // ─── ROLES ────────────────────────────────────────────────────────────────
  roles = [
    {
      id: 'r1',
      name: 'Candidate',
      permissions: [
        'view_competitions',
        'submit_application',
        'use_ai_assistant',
        'manage_profile',
      ],
      userCount: 4200,
    },
    {
      id: 'r2',
      name: 'Company',
      permissions: [
        'create_competition',
        'view_applications',
        'schedule_interview',
        'manage_billing',
        'send_messages',
      ],
      userCount: 312,
    },
    {
      id: 'r3',
      name: 'Admin',
      permissions: [
        'manage_users',
        'manage_companies',
        'view_logs',
        'manage_notifications',
        'override_applications',
        'manage_faqs',
        'manage_support',
      ],
      userCount: 5,
    },
    {
      id: 'r4',
      name: 'Super Admin',
      permissions: [
        'all_admin_permissions',
        'manage_roles',
        'manage_plans',
        'modify_pricing',
        'system_settings',
        'ai_configuration',
        'maintenance_control',
      ],
      userCount: 2,
    },
  ];

  // ─── Current Company (for company dashboard) ─────────────────────────────
  currentCompany = this.companies[0]; // TechNova
  currentCompanyPlan = this.plans[2]; // Pro
  currentCompanySubscription = this.subscriptions[0];
  currentCompanyPayments = this.payments.filter((p) => p.companyId === 'c1');
  currentCompanyCompetitions = this.competitions.filter((c) => c.companyId === 'c1');
  currentCompanyApplications = this.applications.filter((a) =>
    this.currentCompanyCompetitions.map((c) => c.id).includes(a.competitionId),
  );
}
