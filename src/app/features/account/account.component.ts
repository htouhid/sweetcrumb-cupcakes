import { OrderService } from '../../core/services/order.service';
import { OrderCardComponent } from '../../shared/components/order-card/order-card.component';
import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, authErrorMessage } from '../../core/services/auth.service';
@Component({
  selector: 'app-account',
  imports: [RouterLink, OrderCardComponent],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent {
  readonly orders = inject(OrderService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly error = signal<string | null>(null);
  constructor() {
    effect(() => {
      this.auth.currentUser()?.id;
      void this.orders.getMyOrders();
    });
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
