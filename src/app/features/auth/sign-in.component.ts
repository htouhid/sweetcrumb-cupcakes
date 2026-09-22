import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, authErrorMessage } from '../../core/services/auth.service';
@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sign-in.component.html',
  styleUrl: './auth.component.scss',
})
export class SignInComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  invalid(name: 'email' | 'password') {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }
  async submit() {
    if (this.submitting() || this.auth.authLoading()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    try {
      await this.auth.signIn(email, password);
      this.form.controls.password.reset();
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(returnUrl === '/checkout' ? '/checkout' : '/account');
    } catch (error) {
      this.error.set(authErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
