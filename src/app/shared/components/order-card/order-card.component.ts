import { CurrencyPipe } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import {
  Order,
  OrderItem,
  ORDER_STATUS_LABELS,
  orderDateLabel,
  pickupTimeLabel,
} from '../../../core/models/order';
import { OrderService } from '../../../core/services/order.service';
@Component({
  selector: 'app-order-card',
  imports: [CurrencyPipe],
  template: `<article class="order">
    <div class="order-heading">
      <h3>{{ order().order_number }}</h3>
      <span class="status">{{ labels[order().status] }}</span>
    </div>
    <p>Placed {{ dateLabel(order().created_at) }}</p>
    <p>
      Pickup:
      {{ dateLabel(order().pickup_date) }} ·
      {{ timeLabel(order().pickup_time) }}
    </p>
    <div class="order-footer">
      <strong>{{ order().subtotal | currency }}</strong
      ><button
        class="button button-outline"
        (click)="toggle()"
        [attr.aria-expanded]="expanded()"
        [attr.aria-controls]="'items-' + order().id"
      >
        {{ expanded() ? 'Hide details' : 'View details' }}
      </button>
    </div>
    @if (expanded()) {
      <div class="items" [id]="'items-' + order().id">
        @if (loading()) {
          <p role="status">Loading your treats…</p>
        } @else if (error()) {
          <p role="alert">{{ error() }}</p>
          <button class="button button-outline" (click)="load()">Try again</button>
        } @else {
          @for (item of items(); track item.id) {
            <div class="item">
              <div>
                <strong>{{ item.product_name }}</strong>
                <p>{{ item.quantity }} × {{ item.unit_price | currency }}</p>
              </div>
              <strong>{{ item.total | currency }}</strong>
            </div>
          } @empty {
            <p>No item details are available for this order.</p>
          }
        }
      </div>
    }
  </article>`,
  styleUrl: './order-card.component.scss',
})
export class OrderCardComponent {
  readonly order = input.required<Order>();
  private readonly orders = inject(OrderService);
  readonly labels = ORDER_STATUS_LABELS;
  readonly timeLabel = pickupTimeLabel;
  readonly dateLabel = orderDateLabel;
  readonly expanded = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = signal<OrderItem[] | null>(null);
  toggle() {
    this.expanded.update((value) => !value);
    if (this.expanded() && !this.items() && !this.loading()) void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.items.set(await this.orders.getOrderItems(this.order().id));
    } catch {
      this.error.set('These order details couldn’t be loaded. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
