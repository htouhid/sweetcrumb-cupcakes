import { Component, input, signal } from '@angular/core';
@Component({
  selector: 'app-product-image',
  template: `@if (failedSource() !== src()) {
      <img
        [src]="src()"
        [alt]="alt()"
        [loading]="priority() ? 'eager' : 'lazy'"
        (error)="failedSource.set(src())"
      />
    } @else {
      <div class="fallback" role="img" [attr.aria-label]="alt() + ' — image coming soon'">
        <span>✧</span><span class="brand">SweetCrumb</span
        ><small>A little deliciousness awaits</small>
      </div>
    }`,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
        overflow: hidden;
        background: #f1e6dc;
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .fallback {
        min-height: 220px;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        color: #774954;
        background: #f2e4df;
      }
      .brand {
        font:
          30px Georgia,
          serif;
      }
    `,
  ],
})
export class ProductImageComponent {
  readonly src = input.required<string>();
  readonly alt = input.required<string>();
  readonly priority = input(false);
  readonly failedSource = signal<string | null>(null);
}
