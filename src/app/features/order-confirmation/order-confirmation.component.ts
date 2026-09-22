import { CurrencyPipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { ORDER_STATUS_LABELS, PlaceOrderResult } from '../../core/models/order';
@Component({
  selector: 'app-order-confirmation',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './order-confirmation.component.html',
  styleUrl: './order-confirmation.component.scss',
})
export class OrderConfirmationComponent {
  readonly auth = inject(AuthService);
  private readonly orders = inject(OrderService);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  readonly result = signal<PlaceOrderResult | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly labels = ORDER_STATUS_LABELS;
  private revision = 0;
  constructor() {
    effect(() => {
      const number = this.params()?.get('orderNumber');
      this.auth.currentUser();
      if (number) void this.load(number);
    });
  }
  retry() {
    void this.load(this.params()?.get('orderNumber') ?? '');
  }
  private async load(number: string) {
    const revision = ++this.revision;
    this.error.set(null);
    this.result.set(null);
    this.loading.set(true);
    const recent = this.orders.lastResult();
    if (recent?.order_number === number) {
      this.result.set(recent);
      this.loading.set(false);
      return;
    }
    try {
      const order = await this.orders.getOrderByNumber(number);
      if (revision === this.revision && order)
        this.result.set({
          order_id: order.id,
          order_number: order.order_number,
          subtotal: order.subtotal,
          status: order.status,
        });
    } catch {
      if (revision === this.revision)
        this.error.set('We couldn’t load this order. Please try again.');
    } finally {
      if (revision === this.revision) this.loading.set(false);
    }
  }
}
