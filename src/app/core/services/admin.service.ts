import { NextOrderStatus, UpdateOrderStatusResult } from '../models/admin-order-workflow';
import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { Order, OrderItem, orderAmount, OrderStatus, ORDER_STATUS_LABELS } from '../models/order';

export type AdminStatusFilter = OrderStatus | 'all';
export function filterAdminOrders(
  orders: readonly Order[],
  filter: AdminStatusFilter,
): readonly Order[] {
  return filter === 'all' ? orders : orders.filter((order) => order.status === filter);
}

/** Scoped to the admin route. These UX checks supplement, never replace, database RLS. */
@Injectable()
export class AdminService {
  private readonly client = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);
  private readonly state = signal<{ userId: string; orders: readonly Order[] } | null>(null);
  private readonly loadingState = signal(true);
  private readonly errorState = signal<string | null>(null);
  private revision = 0;
  private ordersRequest?: { userId: string | undefined; promise: Promise<void> };
  private readonly updatingState = signal<string | null>(null);
  readonly updatingOrderId = this.updatingState.asReadonly();
  readonly orders = computed(() =>
    this.auth.isAdmin() && this.state()?.userId === this.auth.currentUser()?.id
      ? (this.state()?.orders ?? [])
      : [],
  );
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly summary = computed(() => {
    const orders = this.orders();
    return {
      newOrders: orders.filter(
        (order) => order.status === 'received' || order.status === 'confirmed',
      ).length,
      preparing: orders.filter((order) => order.status === 'preparing').length,
      ready: orders.filter((order) => order.status === 'ready').length,
      completed: orders.filter((order) => order.status === 'completed').length,
    };
  });
  readonly recentOrders = computed(() => this.orders().slice(0, 5));

  getOrders(): Promise<void> {
    const userId = this.auth.currentUser()?.id;
    if (this.ordersRequest?.userId === userId && this.ordersRequest)
      return this.ordersRequest.promise;
    const promise = this.fetchOrders().finally(() => {
      if (this.ordersRequest?.promise === promise) this.ordersRequest = undefined;
    });
    this.ordersRequest = { userId, promise };
    return promise;
  }

  async updateOrderStatus(
    orderId: string,
    newStatus: NextOrderStatus,
  ): Promise<UpdateOrderStatusResult> {
    if (this.updatingOrderId())
      throw new Error('A status change is already in progress. Please wait.');
    const userId = this.auth.currentUser()?.id;
    if (!userId || !this.auth.isAdmin())
      throw new Error('Please sign in with an administrator account to change order status.');
    if (!orderId || !['confirmed', 'preparing', 'ready', 'completed'].includes(newStatus))
      throw new Error('This status action is not available.');
    this.updatingState.set(orderId);
    try {
      const { data, error } = await this.client.rpc('update_order_status', {
        p_order_id: orderId,
        p_new_status: newStatus,
      });
      if (error) throw new Error('Status request rejected');
      const result = data as UpdateOrderStatusResult | null;
      if (
        !result ||
        result.order_id !== orderId ||
        result.status !== newStatus ||
        typeof result.order_number !== 'string' ||
        typeof result.updated_at !== 'string' ||
        !Number.isFinite(Date.parse(result.updated_at)) ||
        !Object.hasOwn(ORDER_STATUS_LABELS, result.previous_status)
      )
        throw new Error('Unrecognized status result');
      // Only an acknowledged RPC result can change the local status; never update optimistically.
      if (this.auth.isAdmin() && this.auth.currentUser()?.id === userId) {
        this.state.update((state) =>
          state?.userId === userId
            ? {
                ...state,
                orders: state.orders.map((order) =>
                  order.id === orderId
                    ? { ...order, status: result.status, updated_at: result.updated_at }
                    : order,
                ),
              }
            : state,
        );
      }
      return {
        order_id: result.order_id,
        order_number: result.order_number,
        previous_status: result.previous_status,
        status: result.status,
        updated_at: result.updated_at,
      };
    } catch {
      throw new Error(
        'We couldn’t confirm this status change. The order may have changed elsewhere, or your session or permissions may have expired. Review the refreshed status before trying again.',
      );
    } finally {
      // Any earlier read may predate the mutation. Follow it with a fresh authoritative read.
      if (this.ordersRequest) await this.ordersRequest.promise;
      await this.getOrders();
      this.updatingState.set(null);
    }
  }

  private async fetchOrders(): Promise<void> {
    const revision = ++this.revision;
    const userId = this.auth.currentUser()?.id;
    this.errorState.set(null);
    this.state.set(null);
    if (!userId || !this.auth.isAdmin()) {
      this.loadingState.set(false);
      return;
    }
    this.loadingState.set(true);
    try {
      const orders: Order[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await this.client
          .from('orders')
          .select(
            'id, order_number, user_id, customer_name, customer_email, customer_phone, pickup_date, pickup_time, special_instructions, subtotal, status, created_at, updated_at',
          )
          .order('created_at', { ascending: false })
          .order('id')
          .range(offset, offset + 999)
          .returns<Order[]>();
        if (error || !data) throw new Error('Read failed');
        orders.push(...data.map((order) => ({ ...order, subtotal: orderAmount(order.subtotal) })));
        if (data.length < 1000) break;
      }
      if (
        revision === this.revision &&
        this.auth.isAdmin() &&
        this.auth.currentUser()?.id === userId
      )
        this.state.set({ userId, orders });
    } catch {
      if (revision === this.revision)
        this.errorState.set('We couldn’t load bakery orders. Please try again.');
    } finally {
      if (revision === this.revision) this.loadingState.set(false);
    }
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    const userId = this.auth.currentUser()?.id;
    if (!userId || !this.auth.isAdmin()) throw new Error('Administrator access is required.');
    try {
      const items: OrderItem[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await this.client
          .from('order_items')
          .select('id, order_id, product_id, product_name, quantity, unit_price, total, created_at')
          .eq('order_id', orderId)
          .order('created_at')
          .order('id')
          .range(offset, offset + 999)
          .returns<OrderItem[]>();
        if (error || !data) throw new Error('Read failed');
        items.push(
          ...data.map((item) => ({
            ...item,
            unit_price: orderAmount(item.unit_price),
            total: orderAmount(item.total),
          })),
        );
        if (data.length < 1000) break;
      }
      if (!this.auth.isAdmin() || this.auth.currentUser()?.id !== userId)
        throw new Error('Access changed');
      return items;
    } catch {
      throw new Error('We couldn’t load the items for this order. Please try again.');
    }
  }
}
