import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  template: `<header>
    <div class="container header-inner">
      <a routerLink="/" class="wordmark" aria-label="SweetCrumb home" (click)="open.set(false)"
        >SweetCrumb<span>BAKED WITH LOVE</span></a
      >
      <nav aria-label="Main navigation" [class.open]="open()" id="main-navigation">
        <a
          routerLink="/"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="open.set(false)"
          >Home</a
        ><a routerLink="/shop" routerLinkActive="active" (click)="open.set(false)">Shop</a
        ><a routerLink="/" fragment="about" (click)="open.set(false)">About</a>
      </nav>
      <div class="header-actions">
        <button
          class="sign-in"
          (click)="accountNotice.set(!accountNotice())"
          [attr.aria-expanded]="accountNotice()"
          aria-controls="account-notice"
        >
          Sign In</button
        ><a
          class="cart-link"
          routerLink="/cart"
          (click)="open.set(false)"
          [attr.aria-label]="'Your order, ' + cart.totalQuantity() + ' items'"
          ><svg width="22" height="24" viewBox="0 0 24 26" fill="none" aria-hidden="true">
            <path d="M4 8h16l1 15H3L4 8Z" stroke="currentColor" stroke-width="1.5" />
            <path d="M8 9V6a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.5" /></svg
          ><span>{{ cart.totalQuantity() }}</span></a
        ><button
          class="menu-toggle"
          (click)="open.set(!open())"
          [attr.aria-expanded]="open()"
          aria-controls="main-navigation"
          [attr.aria-label]="open() ? 'Close menu' : 'Open menu'"
        >
          {{ open() ? '✕' : '☰' }}
        </button>
      </div>
    </div>
    @if (accountNotice()) {
      <div id="account-notice" class="account-notice" role="status">
        A little more is on the way. Customer accounts are coming soon.<button
          (click)="accountNotice.set(false)"
          aria-label="Dismiss account notice"
        >
          ✕
        </button>
      </div>
    }
  </header>`,
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  readonly cart = inject(CartService);
  readonly open = signal(false);
  readonly accountNotice = signal(false);
}
