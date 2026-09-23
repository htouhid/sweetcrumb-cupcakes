import { Component, effect, inject, untracked } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';
@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  providers: [AdminService],
  template: `<section class="container section admin-shell">
    @if (auth.isAuthenticated() && auth.isAdmin()) {
      <div class="admin-heading">
        <p class="eyebrow">BEHIND THE BAKERY COUNTER</p>
        <h1>SweetCrumb Admin</h1>
        <p>A simple view of today's orders and bakery activity.</p>
      </div>
      <nav class="admin-nav" aria-label="Bakery management">
        <a
          routerLink="/admin"
          routerLinkActive="selected"
          [routerLinkActiveOptions]="{ exact: true }"
          ariaCurrentWhenActive="page"
          >Overview</a
        ><a routerLink="/admin/orders" routerLinkActive="selected" ariaCurrentWhenActive="page"
          >Orders</a
        ><a routerLink="/admin/inventory" routerLinkActive="selected" ariaCurrentWhenActive="page"
          >Inventory</a
        >
      </nav>
      <router-outlet />
    } @else {
      <p role="status">Checking bakery access…</p>
    }
  </section>`,
  styles: [
    `
      .admin-shell {
        min-height: 70vh;
      }
      h1 {
        font-size: clamp(36px, 4vw, 54px);
        margin: 15px 0;
      }
      .admin-heading > p:last-child {
        color: var(--muted);
        font-size: 14px;
        line-height: 1.8;
      }
      .admin-nav {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        padding-bottom: 24px;
        margin: 30px 0;
        border-bottom: 1px solid var(--line);
      }
      .admin-nav a {
        padding: 13px 22px;
        border-radius: 7px;
        text-decoration: none;
        font-size: 13px;
      }
      .selected {
        background: var(--berry);
        color: white;
      }
    `,
  ],
})
export class AdminLayoutComponent {
  readonly auth = inject(AuthService);
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  constructor() {
    effect(() => {
      this.auth.currentUser()?.id;
      const permitted = this.auth.isAdmin() && this.auth.isAuthenticated();
      if (permitted)
        untracked(() => {
          void this.admin.getOrders();
        });
      else if (!this.auth.authLoading() && !this.auth.profileLoading())
        void this.router.navigateByUrl(this.auth.isAuthenticated() ? '/' : '/sign-in');
    });
  }
}
