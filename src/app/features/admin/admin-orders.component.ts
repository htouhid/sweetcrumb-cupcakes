import { Component, computed, inject, signal } from '@angular/core';
import {
  AdminService,
  AdminStatusFilter,
  filterAdminOrders,
} from '../../core/services/admin.service';
import { ORDER_STATUS_LABELS, OrderStatus } from '../../core/models/order';
import { CatalogStatusComponent } from '../../shared/components/catalog-status/catalog-status.component';
import { AdminOrderListComponent } from './admin-order-list.component';
@Component({
  selector: 'app-admin-orders',
  imports: [CatalogStatusComponent, AdminOrderListComponent],
  template: `<div class="section-heading split">
      <div>
        <p class="eyebrow">FROM OUR OVEN TO THEIR OCCASION</p>
        <h2>Bakery Orders</h2>
      </div>
      <button
        class="button button-outline"
        [disabled]="admin.loading()"
        (click)="admin.getOrders()"
      >
        Refresh orders
      </button>
    </div>
    <div class="filters" role="group" aria-label="Filter orders by status">
      @for (filter of filters; track filter.value) {
        <button
          [class.selected]="statusFilter() === filter.value"
          [attr.aria-pressed]="statusFilter() === filter.value"
          (click)="statusFilter.set(filter.value)"
        >
          {{ filter.label }}
        </button>
      }
    </div>
    @if (admin.loading() || admin.error()) {
      <app-catalog-status
        [loading]="admin.loading()"
        [error]="admin.error()"
        (retry)="admin.getOrders()"
      />
    } @else {
      <p class="result-count" aria-live="polite">{{ filteredOrders().length }} orders</p>
      <app-admin-order-list
        [orders]="filteredOrders()"
        [emptyMessage]="admin.orders().length ? 'No orders with this status.' : 'No orders yet.'"
      />
    }`,
  styles: [
    `
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
        margin-bottom: 28px;
      }
      .filters button {
        background: var(--white);
        border: 1px solid var(--line);
        border-radius: 25px;
        padding: 12px 18px;
        font-size: 12px;
      }
      .filters .selected {
        color: white;
        background: var(--berry);
        border-color: var(--berry);
      }
      .result-count {
        font-size: 12px;
        color: var(--muted);
      }
    `,
  ],
})
export class AdminOrdersComponent {
  constructor() {
    void this.admin.getOrders();
  }
  readonly admin = inject(AdminService);
  readonly statusFilter = signal<AdminStatusFilter>('all');
  readonly filters: Array<{ value: AdminStatusFilter; label: string }> = [
    { value: 'all', label: 'All' },
    ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
      value: value as OrderStatus,
      label,
    })),
  ];
  readonly filteredOrders = computed(() =>
    filterAdminOrders(this.admin.orders(), this.statusFilter()),
  );
}
