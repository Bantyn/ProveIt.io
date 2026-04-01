import { Injectable, inject } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  authState,
} from '@angular/fire/auth';
import { ApiService } from './api.service';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { NgZone } from '@angular/core';

import { shareReplay, distinctUntilChanged } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private api = inject(ApiService);
  private router = inject(Router);
  private zone = inject(NgZone);

  // Expose current auth state (null if not logged in)
  user$ = new Observable<any>((subscriber) => {
    return authState(this.auth).subscribe({
      next: (user) => this.zone.run(() => subscriber.next(user)),
      error: (err) => this.zone.run(() => subscriber.error(err)),
      complete: () => this.zone.run(() => subscriber.complete()),
    });
  }).pipe(
    distinctUntilChanged((prev, curr) => prev?.uid === curr?.uid),
    shareReplay(1)
  );

  // Login Logic
  loginForm = false;
  regForm = true;
  name = '';
  email = '';
  password = '';

  constructor() {
    // Initial check
    this.sessionSubject.next(this.hasCookie('auth_token'));
    
    // Sync with Firebase auth state changes
    authState(this.auth).subscribe((user) => {
      this.zone.run(() => {
        const hasToken = this.hasCookie('auth_token');
        if (this.sessionSubject.value !== hasToken) {
          this.sessionSubject.next(hasToken);
        }
      });
    });
  }

  async registerUser(email: string, pass: string, name: string, role: string) {
    try {
      console.log('Registering user in Firebase...', email);
      const cred = await createUserWithEmailAndPassword(this.auth, email, pass);
      console.log('Firebase registration successful:', cred.user.uid);

      // Synchronize with our Backend
      console.log('Creating user in backend database...');
      await firstValueFrom(
        this.api.createUser({
          id: cred.user.uid,
          name: name,
          email: email,
          role: role,
          status: 'active',
        }),
      );

      // If role is company, also create a company entry
      if (role === 'company') {
        console.log('Creating company entry in backend...');
        await firstValueFrom(
          this.api.createCompany({
            ownerId: cred.user.uid,
            companyName: name, // Default to user full name
            industry: 'Technology', // Default value
            email: email,
            verificationStatus: 'pending',
            isSuspended: false,
            jobCredits: 0,
            stats: {
              competitions: { total: 0, hiring: 0, skill: 0, active: 0, completed: 0 },
              hiring: { totalParticipants: 0, shortlisted: 0, hired: 0, hireRate: 0 },
              performance: { avgCandidateScore: 0, avgWinningScore: 0, evaluationConsistency: 0 },
              engagement: { totalSubmissions: 0, avgSubmissionsPerCompetition: 0 },
            },
            isDeleted: false,
            isProfileCompleted: false, // Must be true to create competitions
          }),
        );
      }

      console.log('Backend sync successful');

      this.setSession(cred.user.uid, role);

      // Auto-navigate based on role after successful registration
      if (role === 'company') {
        this.router.navigate(['/company/dashboard']);
      } else if (role === 'admin') {
        this.router.navigate(['/admin/overview']);
      } else {
        this.router.navigate(['/home']);
      }

      return cred.user;
    } catch (err) {
      console.error('Registration error details:', err);
      throw err;
    }
  }

  async loginUser(email: string, pass: string) {
    try {
      const cred = await signInWithEmailAndPassword(this.auth, email, pass);

      // Determine what to do next based on user role from our backend
      this.api.getUser(cred.user.uid).subscribe({
        next: (userData: any) => {
          this.zone.run(() => {
            this.setSession(cred.user.uid, userData.role);
            if (userData.role === 'admin') {
              this.router.navigate(['/admin/overview']);
            } else if (userData.role === 'company') {
              this.router.navigate(['/company/dashboard']);
            } else {
              this.router.navigate(['/home']);
            }
          });
        },
        error: (err) => {
          this.zone.run(() => {
            console.error('User document not found in db', err);
            this.router.navigate(['/home']);
          });
        },
      });
      return cred.user;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(this.auth, provider);

      // Check if user exists in backend
      this.api.getUser(cred.user.uid).subscribe({
        next: (userData: any) => {
          this.zone.run(() => {
            this.setSession(cred.user.uid, userData.role);
            // Exists
            if (userData.role === 'admin') {
              this.router.navigate(['/admin/overview']);
            } else if (userData.role === 'company') {
              this.router.navigate(['/company/dashboard']);
            } else {
              this.router.navigate(['/home']);
            }
          });
        },
        error: async (err) => {
          // Doesn't exist, create automatically
          await firstValueFrom(
            this.api.createUser({
              id: cred.user.uid,
              name: cred.user.displayName || 'Google User',
              email: cred.user.email,
              role: 'candidate',
              status: 'active',
            }),
          );
          this.zone.run(() => {
            this.setSession(cred.user.uid, 'candidate');
            this.router.navigate(['/home']);
          });
        },
      });
      return cred.user;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  private sessionSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.sessionSubject.asObservable();

  private hasCookie(name: string) {
    if (typeof document === 'undefined') return false;
    return document.cookie.split('; ').some(r => r.trim().startsWith(name + '='));
  }


  async logOut() {
    try {
      console.log('Logging out...');
      await signOut(this.auth);
    } catch (err) {
      console.error('Firebase signOut error', err);
    } finally {
      this.clearSession();
      console.log('Session cleared. Redirecting...');
      // Using window.location.href ensures all app state is wiped and we start fresh
      window.location.href = '/';
    }
  }

  private setSession(uid: string, role: string) {
    const maxAge = 60 * 60 * 24; // 24 hours
    document.cookie = `auth_token=${uid}; Max-Age=${maxAge}; path=/`;
    document.cookie = `user_role=${role}; Max-Age=${maxAge}; path=/`;
    this.sessionSubject.next(true);
  }

  private clearSession() {
    // Clear cookies with all possible variants to be safe
    document.cookie = 'auth_token=; Max-Age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'user_role=; Max-Age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Also clear localStorage just in case
    localStorage.removeItem('user');
    sessionStorage.clear();
    this.sessionSubject.next(false);
  }
}
