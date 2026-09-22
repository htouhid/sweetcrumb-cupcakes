import { Component, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, authErrorMessage } from '../../../core/services/auth.service';
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
        <div class="account-area" #accountArea (focusout)="onAccountFocusOut($event)">
          @if (auth.authLoading() && !auth.isAuthenticated()) {
            <span class="sign-in" role="status">One moment…</span>
          } @else if (auth.isAuthenticated()) {
            <button
              #accountTrigger
              class="sign-in account-trigger"
              (click)="toggleAccount()"
              [attr.aria-expanded]="accountOpen()"
              aria-controls="account-menu"
            >
              Hi, {{ auth.firstName() }} <span aria-hidden="true">⌄</span>
            </button>
            @if (accountOpen()) {
              <div class="account-menu" id="account-menu" aria-label="Account actions">
                <a routerLink="/account" (click)="accountOpen.set(false)">My Account</a>
                <a routerLink="/account" (click)="accountOpen.set(false)">My Orders</a>
                <button (click)="signOut()" [disabled]="auth.authLoading()">
                  {{ auth.authLoading() ? 'Signing out…' : 'Sign Out' }}
                </button>
              </div>
            }
          } @else {
            <a class="sign-in" routerLink="/sign-in" (click)="open.set(false)">Sign In</a>
          }
        </div>
        <a
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
          (click)="open.set(!open()); accountOpen.set(false)"
          [attr.aria-expanded]="open()"
          aria-controls="main-navigation"
          [attr.aria-label]="open() ? 'Close menu' : 'Open menu'"
        >
          {{ open() ? '✕' : '☰' }}
        </button>
      </div>
    </div>
    @if (signOutError(); as message) {
      <div class="account-notice" role="alert">
        {{ message
        }}<button (click)="signOutError.set(null)" aria-label="Dismiss sign out error">✕</button>
      </div>
    }
  </header>`,
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  readonly cart = inject(CartService);
  readonly open = signal(false);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly accountOpen = signal(false);
  readonly signOutError = signal<string | null>(null);
  private readonly accountArea = viewChild<ElementRef<HTMLElement>>('accountArea');
  private readonly accountTrigger = viewChild<ElementRef<HTMLButtonElement>>('accountTrigger');

  toggleAccount() {
    this.accountOpen.update((value) => !value);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.accountArea()?.nativeElement.contains(event.target as Node))
      this.accountOpen.set(false);
  }

  @HostListener('keydown.escape', ['$event'])
  onEscape(event: Event) {
    if (this.accountOpen()) {
      event.preventDefault();
      this.accountOpen.set(false);
      this.accountTrigger()?.nativeElement.focus();
    }
    this.open.set(false);
  }

  onAccountFocusOut(event: FocusEvent) {
    if (!this.accountArea()?.nativeElement.contains(event.relatedTarget as Node | null))
      this.accountOpen.set(false);
  }

  async signOut() {
    this.signOutError.set(null);
    try {
      await this.auth.signOut();
      this.accountOpen.set(false);
      await this.router.navigateByUrl('/sign-in');
    } catch (error) {
      this.signOutError.set(authErrorMessage(error));
    }
  }
}
