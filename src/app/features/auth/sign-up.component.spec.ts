import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { SignUpComponent } from './sign-up.component';

describe('SignUpComponent', () => {
  const signUp = vi.fn();
  beforeEach(() => {
    signUp.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { authLoading: signal(false), signUp } },
      ],
    });
  });
  function setup() {
    const fixture = TestBed.createComponent(SignUpComponent);
    const component = fixture.componentInstance;
    component.form.setValue({
      firstName: 'Avery',
      lastName: 'Baker',
      email: 'avery@example.test',
      password: 'test-password',
      confirmPassword: 'test-password',
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    return { fixture, component, navigate };
  }
  it('rejects blank names, invalid email, short passwords, and mismatches', async () => {
    const { component } = setup();
    component.form.patchValue({
      firstName: ' ',
      email: 'invalid',
      password: 'short',
      confirmPassword: 'different',
    });
    await component.submit();
    expect(component.form.controls.firstName.hasError('required')).toBe(true);
    expect(component.form.controls.email.hasError('email')).toBe(true);
    expect(component.form.controls.password.hasError('minlength')).toBe(true);
    expect(component.mismatch()).toBe(true);
    expect(signUp).not.toHaveBeenCalled();
  });
  it('shows confirmation instructions without navigating when no session is returned', async () => {
    signUp.mockResolvedValue({ needsConfirmation: true });
    const { fixture, component, navigate } = setup();
    await component.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Check your inbox.');
    expect(component.form.controls.password.value).toBe('');
    expect(navigate).not.toHaveBeenCalled();
  });
  it('navigates to account for an immediate signup session', async () => {
    signUp.mockResolvedValue({ needsConfirmation: false });
    const { component, navigate } = setup();
    await component.submit();
    expect(navigate).toHaveBeenCalledWith('/account');
  });
});
