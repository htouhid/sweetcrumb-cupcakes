import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import { CatalogStatusComponent } from '../../shared/components/catalog-status/catalog-status.component';
import { AdminOrderListComponent } from './admin-order-list.component';
@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, CatalogStatusComponent, AdminOrderListComponent],
  template: `@if (admin.loading() || admin.error()) {
      <app-catalog-status
        [loading]="admin.loading()"
        [error]="admin.error()"
        (retry)="admin.getOrders()"
      />
    } @else {
      <p class="scope">Order totals across all dates</p>
      <div class="summary-grid">
        <article>
          <p>New Orders</p>
          <strong>{{ admin.summary().newOrders }}</strong
          ><small>Received & confirmed</small>
        </article>
        <article>
          <p>Preparing</p>
          <strong>{{ admin.summary().preparing }}</strong
          ><small>In the bakery</small>
        </article>
        <article>
          <p>Ready for Pickup</p>
          <strong>{{ admin.summary().ready }}</strong
          ><small>Ready for a sweet moment</small>
        </article>
        <article>
          <p>Completed</p>
          <strong>{{ admin.summary().completed }}</strong
          ><small>Happiness, handed over</small>
        </article>
      </div>
      <div class="section-heading split">
        <h2>Recent Orders</h2>
        <div class="actions">
          <button class="button button-outline" (click)="admin.getOrders()">Refresh</button
          ><a routerLink="/admin/orders" class="text-link">View all orders →</a>
        </div>
      </div>
      <app-admin-order-list [orders]="admin.recentOrders()" actionLabel="View Order" />
    }`,
  styles: [
    `
      .scope {
        color: var(--muted);
        font-size: 12px;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 20px;
        margin: 20px 0 40px;
      }
      article {
        background: var(--white);
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 24px;
      }
      article:first-child {
        background: #f3e5e0;
      }
      article p {
        font-size: 13px;
        margin: 0 0 18px;
      }
      article strong {
        display: block;
        font: 44px var(--serif);
        color: var(--berry);
        margin-bottom: 12px;
      }
      small {
        color: var(--muted);
        font-size: 11px;
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
      }
      @media (max-width: 850px) {
        .summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 380px) {
        .summary-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminDashboardComponent {
  constructor() {
    void this.admin.getOrders();
  }
  readonly admin = inject(AdminService);
}
