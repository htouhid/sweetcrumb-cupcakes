import { CurrencyPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Order,
  ORDER_STATUS_LABELS,
  orderDateLabel,
  pickupTimeLabel,
} from '../../core/models/order';
@Component({
  selector: 'app-admin-order-list',
  imports: [CurrencyPipe, RouterLink],
  template: `<div class="order-list">
    @for (order of orders(); track order.id) {
      <article class="order-row">
        <div>
          <span class="label">Order Number</span>
          <h3>{{ order.order_number }}</h3>
          <p>Placed {{ dateLabel(order.created_at) }}</p>
        </div>
        <div>
          <span class="label">Customer</span><strong>{{ order.customer_name }}</strong>
        </div>
        <div>
          <span class="label">Pickup</span><strong>{{ dateLabel(order.pickup_date) }}</strong>
          <p>{{ timeLabel(order.pickup_time) }}</p>
        </div>
        <div>
          <span class="label">Total</span><strong>{{ order.subtotal | currency }}</strong>
        </div>
        <div>
          <span class="label">Status</span><span class="status">{{ labels[order.status] }}</span>
        </div>
        <a
          class="button button-outline"
          [routerLink]="['/admin/orders', order.id]"
          [attr.aria-label]="actionLabel() + ' ' + order.order_number"
          >{{ actionLabel() }}</a
        >
      </article>
    } @empty {
      <div class="empty-state">
        <h3>{{ emptyMessage() }}</h3>
        <p>New SweetCrumb orders will appear here.</p>
      </div>
    }
  </div>`,
  styleUrl: './admin-order-list.component.scss',
})
export class AdminOrderListComponent {
  readonly orders = input.required<readonly Order[]>();
  readonly actionLabel = input('View Details');
  readonly emptyMessage = input('No orders yet.');
  readonly labels = ORDER_STATUS_LABELS;
  readonly dateLabel = orderDateLabel;
  readonly timeLabel = pickupTimeLabel;
}
