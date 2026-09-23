import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-admin-inventory',
  imports: [RouterLink],
  template: `<div class="inventory">
    <span aria-hidden="true">✧</span>
    <p class="eyebrow">A LITTLE MORE IS ON THE WAY</p>
    <h2>Inventory Management</h2>
    <p>Inventory controls are coming in the next step.</p>
    <a routerLink="/admin/orders" class="button button-outline">View bakery orders</a>
  </div>`,
  styles: [
    `
      .inventory {
        text-align: center;
        padding: 65px 24px;
        border: 1px solid var(--line);
        background: var(--white);
        border-radius: 16px;
      }
      .inventory > span {
        color: var(--berry);
        font-size: 48px;
      }
      h2 {
        font-size: 36px;
      }
      p {
        color: var(--muted);
        font-size: 14px;
        margin-bottom: 28px;
      }
    `,
  ],
})
export class AdminInventoryComponent {}
