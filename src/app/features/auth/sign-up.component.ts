import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, authErrorMessage } from '../../core/services/auth.service';
import { nonBlank, passwordsMatch } from './auth-form.validators';
@Component({
  selector: 'app-sign-up',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sign-up.component.html',
  styleUrl: './auth.component.scss',
})
export class SignUpComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly submitting = signal(false);
  readonly confirmationSent = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group(
    {
      firstName: ['', nonBlank],
      lastName: ['', nonBlank],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );
  invalid(name: keyof typeof this.form.controls) {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }
  mismatch() {
    return this.form.controls.confirmPassword.touched && this.form.hasError('passwordMismatch');
  }
  async submit() {
    if (this.submitting() || this.auth.authLoading()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);
    const { firstName, lastName, email, password } = this.form.getRawValue();
    try {
      const result = await this.auth.signUp(firstName, lastName, email, password);
      this.form.reset();
      if (result.needsConfirmation) this.confirmationSent.set(true);
      else await this.router.navigateByUrl('/account');
    } catch (error) {
      this.error.set(authErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
