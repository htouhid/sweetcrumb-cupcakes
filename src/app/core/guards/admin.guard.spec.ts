import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  const loggedIn = signal(false);
  const role = signal<'customer' | 'admin' | null>(null);
  function setup(initialize = () => Promise.resolve(), whenProfileReady = () => Promise.resolve()) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            initialize,
            whenProfileReady,
            isAuthenticated: loggedIn,
            isAdmin: computed(() => role() === 'admin'),
          },
        },
      ],
    });
  }
  const check = () =>
    TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url: '/admin' } as RouterStateSnapshot),
    );
  beforeEach(() => {
    loggedIn.set(false);
    role.set(null);
  });
  it('redirects unauthenticated visitors to sign-in', async () => {
    setup();
    expect(await check()).toEqual(TestBed.inject(Router).createUrlTree(['/sign-in']));
  });
  it('redirects authenticated customers and missing profiles to home', async () => {
    setup();
    loggedIn.set(true);
    role.set('customer');
    expect(await check()).toEqual(TestBed.inject(Router).createUrlTree(['/']));
    role.set(null);
    expect(await check()).toEqual(TestBed.inject(Router).createUrlTree(['/']));
  });
  it('allows only the admin role', async () => {
    setup();
    loggedIn.set(true);
    role.set('admin');
    expect(await check()).toBe(true);
  });
  it('waits for both session initialization and the latest profile', async () => {
    let initialized!: () => void;
    let loaded!: () => void;
    setup(
      () =>
        new Promise((resolve) => {
          initialized = resolve;
        }),
      () =>
        new Promise((resolve) => {
          loaded = resolve;
        }),
    );
    let settled = false;
    const pending = Promise.resolve(check()).then((value) => {
      settled = true;
      return value;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    loggedIn.set(true);
    initialized();
    await Promise.resolve();
    expect(settled).toBe(false);
    role.set('admin');
    loaded();
    expect(await pending).toBe(true);
  });
});
