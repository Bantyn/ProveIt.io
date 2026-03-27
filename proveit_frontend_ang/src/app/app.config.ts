import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  APP_INITIALIZER,
  inject,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';

import { initializeApp, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { provideFirebaseApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { environment } from './environments/eniroment';
import { ThemeService } from './services/theme.service';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { adminBypassInterceptor } from './interceptors/admin-bypass.interceptor';

export function initTheme(themeService: ThemeService) {
  return () => themeService.initTheme();
}

import { FirebaseApp } from '@angular/fire/app';

export function initAnalytics() {
  const app = inject(FirebaseApp);
  return async () => {
    if (typeof window !== 'undefined') {
      try {
        // Extra check for ad-blockers or network restrictions
        const supported = await isSupported().catch(() => false);
        if (supported) {
          getAnalytics(app);
          console.log('Firebase Analytics initialized successfully.');
        } else {
          console.warn('Firebase Analytics is not supported in this environment.');
        }
      } catch (err) {
        // Log at info/debug level to avoid cluttering the console with high-severity errors for expected behavior
        console.info(
          'Firebase Analytics initialization skipped (likely blocked by client or network):',
          err,
        );
      }
    }
  };
}

import {
  LucideAngularModule,
  Palette,
  Code,
  Search,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Database,
  Layers,
  LayoutDashboard,
  UserCog,
  Settings,
  LogOut,
  X,
  Menu,
  Trophy,
  Users,
  Building2,
  Bell,
  Wallet,
  Cpu,
  ShieldCheck,
  House,
  Folder,
  Calendar,
  GitBranch,
} from 'lucide-angular';
import { importProvidersFrom } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      })
    ),
    provideHttpClient(withInterceptors([adminBypassInterceptor])),
    provideCharts(withDefaultRegisterables()),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    importProvidersFrom(
      LucideAngularModule.pick({
        Palette,
        Code,
        Search,
        ArrowRight,
        ArrowLeft,
        Smartphone,
        Database,
        Layers,
        LayoutDashboard,
        UserCog,
        Settings,
        LogOut,
        X,
        Menu,
        Trophy,
        Users,
        Building2,
        Bell,
        Wallet,
        Cpu,
        ShieldCheck,
        House,
        Folder,
        Calendar,
        GitBranch,
      }),
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initTheme,
      deps: [ThemeService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initAnalytics,
      multi: true,
    },
  ],
};
