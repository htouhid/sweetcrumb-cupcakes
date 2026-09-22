import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { SignInComponent } from './sign-in.component';

describe('Sign-in destination', () => {
  for (const [returnUrl, expected] of [
    ['/checkout', '/checkout'],
    ['https://example.test', '/account'],
    ['//example.test', '/account'],
  ]) {
    it(`routes ${returnUrl} safely after authentication`, async () => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { queryParamMap: convertToParamMap({ returnUrl }) } },
          },
          {
            provide: AuthService,
            useValue: { authLoading: signal(false), signIn: vi.fn().mockResolvedValue(undefined) },
          },
        ],
      });
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      const component = TestBed.createComponent(SignInComponent).componentInstance;
      component.form.setValue({ email: 'avery@example.test', password: 'test-password' });
      await component.submit();
      expect(navigate).toHaveBeenCalledWith(expected);
    });
  }
});
