import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `<footer>
    <div class="container footer-grid">
      <div>
        <a class="wordmark" routerLink="/">SweetCrumb</a>
        <p>Little moments, made sweeter.<br />Handcrafted with care. Shared with love.</p>
      </div>
      <div>
        <h3>Explore</h3>
        <a routerLink="/shop">Shop</a><a routerLink="/" fragment="about">About</a>
      </div>
      <div>
        <h3>Customer</h3>
        <a routerLink="/account">My Account</a><a routerLink="/account">My Orders</a>
      </div>
      <div class="footer-note">
        <span class="eyebrow">A LITTLE JOY, EVERY DAY</span>
        <p>There’s always a reason<br />for something sweet.</p>
      </div>
    </div>
    <div class="container footer-bottom">
      <span>© {{ year }} SweetCrumb. All rights reserved.</span
      ><span>Baked with love, down to the last crumb.</span>
    </div>
  </footer>`,
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
