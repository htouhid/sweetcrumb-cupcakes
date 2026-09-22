import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  it('waits for initialization before allowing a restored user', async () => {
    let finish!: () => void;
    const ready = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const authenticated = signal(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { initialize: () => ready, isAuthenticated: authenticated },
        },
      ],
    });
    let settled = false;
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    const completion = Promise.resolve(result).then((value) => {
      settled = true;
      return value;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    authenticated.set(true);
    finish();
    expect(await completion).toBe(true);
  });
  it('returns a sign-in UrlTree for a logged-out visitor', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { initialize: () => Promise.resolve(), isAuthenticated: () => false },
        },
      ],
    });
    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/sign-in']));
  });
  it('preserves checkout as the destination for sign-in', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { initialize: () => Promise.resolve(), isAuthenticated: () => false },
        },
      ],
    });
    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/checkout' } as RouterStateSnapshot),
    );
    expect(result).toEqual(
      TestBed.inject(Router).createUrlTree(['/sign-in'], {
        queryParams: { returnUrl: '/checkout' },
      }),
    );
  });
});
