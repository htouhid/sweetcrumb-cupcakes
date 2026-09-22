import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, authErrorMessage } from '../../core/services/auth.service';
@Component({
  selector: 'app-account',
  imports: [RouterLink],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly error = signal<string | null>(null);
  constructor() {
    effect(() => {
      if (!this.auth.authLoading() && !this.auth.isAuthenticated())
        void this.router.navigateByUrl('/sign-in');
    });
  }
  async signOut() {
    this.error.set(null);
    try {
      await this.auth.signOut();
      await this.router.navigateByUrl('/sign-in');
    } catch (error) {
      this.error.set(authErrorMessage(error));
    }
  }
}
