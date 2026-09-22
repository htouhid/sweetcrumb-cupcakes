import { Component, input, output } from '@angular/core';
@Component({
  selector: 'app-catalog-status',
  template: `<div
    class="catalog-status"
    [attr.role]="error() ? 'alert' : 'status'"
    [attr.aria-busy]="loading()"
  >
    <span class="flourish" aria-hidden="true">✧</span>
    @if (loading()) {
      <p>Getting your sweet favorites ready…</p>
    } @else if (error(); as message) {
      <p>{{ message }}</p>
      <button class="button button-outline" (click)="retry.emit()">Try again</button>
    }
  </div>`,
  styles: [
    `
      :host {
        display: block;
        grid-column: 1 / -1;
      }
      .catalog-status {
        text-align: center;
        padding: 45px 24px;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: var(--white);
      }
      .flourish {
        font-size: 30px;
        color: var(--berry);
      }
      p {
        color: var(--muted);
        font-size: 14px;
        line-height: 1.8;
      }
    `,
  ],
})
export class CatalogStatusComponent {
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly retry = output<void>();
}
