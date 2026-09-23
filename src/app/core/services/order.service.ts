import { OrderEmailStatus, parseOrderEmailStatus } from '../models/order-email';
import { computed, inject, Injectable, isDevMode, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import {
  isActiveOrder,
  Order,
  OrderItem,
  orderAmount,
  ORDER_STATUS_LABELS,
  PlaceOrderRequest,
  PlaceOrderResult,
} from '../models/order';

export class OrderPlacementError extends Error {
  constructor(
    message: string,
    readonly inventoryRelated = false,
    readonly uncertain = false,
  ) {
    super(message);
  }
}
function placementError(error: unknown): OrderPlacementError {
  if (error instanceof OrderPlacementError) return error;
  const message =
    typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : '';
  if (/inventory|out of stock|not available|unavailable|insufficient stock/i.test(message)) {
    const safeMessage = /^Not enough inventory for .{1,160}\. Only \d+ available\.?$/i.test(message)
      ? message
      : 'One of your treats is no longer available in the quantity requested.';
    return new OrderPlacementError(
      `${safeMessage} Please review your cart and adjust quantities.`,
      true,
    );
  }
  if (/auth|jwt|session|logged|sign.?in/i.test(message))
    return new OrderPlacementError(
      'Your session may have expired. Please sign in again before placing your order.',
    );
  // A lost response may follow a committed transaction. Never automatically retry order creation.
  return new OrderPlacementError(
    'We couldn’t confirm whether your order was received. Please check My Orders before trying again.',
    false,
    true,
  );
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly client = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);
  private readonly orderState = signal<readonly Order[]>([]);
  private readonly loadingUser = signal<string | null>(null);
  private readonly errorState = signal<{ userId: string; message: string } | null>(null);
  private readonly placingState = signal(false);
  private readonly resultState = signal<{ userId: string; result: PlaceOrderResult } | null>(null);
  readonly orders = computed(() =>
    this.orderState().filter((order) => order.user_id === this.auth.currentUser()?.id),
  );
  readonly loading = computed(
    () => !!this.loadingUser() && this.loadingUser() === this.auth.currentUser()?.id,
  );
  readonly error = computed(() =>
    this.errorState()?.userId === this.auth.currentUser()?.id
      ? (this.errorState()?.message ?? null)
      : null,
  );
  readonly placingOrder = this.placingState.asReadonly();
  readonly lastResult = computed(() =>
    this.resultState()?.userId === this.auth.currentUser()?.id
      ? (this.resultState()?.result ?? null)
      : null,
  );
  readonly activeOrders = computed(() => this.orders().filter(isActiveOrder));
  readonly orderHistory = computed(() => this.orders().filter((order) => !isActiveOrder(order)));
  private listRevision = 0;
  private readonly emailStates = signal<Record<string, OrderEmailStatus>>({});

  emailStatusFor(orderId: string): OrderEmailStatus | null {
    const userId = this.auth.currentUser()?.id;
    return userId ? (this.emailStates()[`${userId}:${orderId}`] ?? null) : null;
  }

  /** Best effort: all notification failures resolve separately from the committed order. */
  async sendOrderEmails(orderId: string): Promise<OrderEmailStatus> {
    const userId = this.auth.currentUser()?.id;
    if (!userId || !orderId.trim()) return parseOrderEmailStatus(null);
    const key = `${userId}:${orderId}`;
    this.emailStates.update((states) => ({
      ...states,
      [key]: { state: 'pending', customerEmailSent: null, adminEmailSent: null },
    }));
    let status: OrderEmailStatus;
    try {
      const { data, error } = await this.client.functions.invoke('send-order-emails', {
        body: { order_id: orderId },
        timeout: 45000,
      });
      let body: unknown = data;
      // Non-2xx responses put the function's JSON in FunctionsHttpError.context.
      if (
        error &&
        typeof error === 'object' &&
        'context' in error &&
        error.context instanceof Response
      ) {
        body = await error.context
          .clone()
          .json()
          .catch(() => null);
      }
      status = parseOrderEmailStatus(body, !!error);
    } catch {
      status = parseOrderEmailStatus(null);
    }
    this.emailStates.update((states) => ({ ...states, [key]: status }));
    return status;
  }

  /** TEMPORARY: browser-console helper. Guarded in production; never used by checkout. */
  async sendOrderEmailsForDevelopment(orderId: string): Promise<OrderEmailStatus> {
    if (!isDevMode()) throw new Error('This helper is available only in development.');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId))
      throw new Error('Provide an existing order UUID, not an order number.');
    await this.auth.initialize();
    const userId = this.auth.currentUser()?.id;
    if (!userId) throw new Error('Sign in as the customer who owns this order.');
    const { data, error } = await this.client
      .from('orders')
      .select('id, user_id')
      .eq('id', orderId)
      .eq('user_id', userId)
      .maybeSingle<{ id: string; user_id: string }>();
    if (
      error ||
      !data ||
      data.id !== orderId ||
      data.user_id !== userId ||
      this.auth.currentUser()?.id !== userId
    )
      throw new Error('The existing order could not be verified for this customer.');
    return this.sendOrderEmails(orderId);
  }

  async placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResult> {
    if (this.placingOrder())
      throw new OrderPlacementError('Your order is already being sent. Please wait.');
    const userId = this.auth.currentUser()?.id;
    if (!userId) throw new OrderPlacementError('Please sign in to place your order.');
    if (
      !request.items.length ||
      request.items.some(
        (item) => !item.product_id || !Number.isSafeInteger(item.quantity) || item.quantity < 1,
      )
    )
      throw new OrderPlacementError('Please add at least one treat to your order.');
    this.placingState.set(true);
    try {
      const { data, error } = await this.client.rpc('place_order', {
        p_items: request.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
        p_customer_name: request.customer_name.trim(),
        p_customer_phone: request.customer_phone?.trim() || null,
        p_pickup_date: request.pickup_date,
        p_pickup_time: request.pickup_time,
        p_special_instructions: request.special_instructions?.trim() || null,
      });
      if (error) throw error;
      const row = data as PlaceOrderResult | null;
      if (
        !row ||
        typeof row.order_id !== 'string' ||
        typeof row.order_number !== 'string' ||
        !Object.hasOwn(ORDER_STATUS_LABELS, row.status)
      )
        throw new Error('Unrecognized order result');
      const result = {
        order_id: row.order_id,
        order_number: row.order_number,
        status: row.status,
        subtotal: orderAmount(row.subtotal),
      };
      this.resultState.set({ userId, result });
      return result;
    } catch (error) {
      throw placementError(error);
    } finally {
      this.placingState.set(false);
    }
  }

  async getMyOrders(): Promise<void> {
    const userId = this.auth.currentUser()?.id;
    const revision = ++this.listRevision;
    this.orderState.set([]);
    this.errorState.set(null);
    if (!userId) {
      this.loadingUser.set(null);
      return;
    }
    this.loadingUser.set(userId);
    try {
      const all: Order[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await this.client
          .from('orders')
          .select(
            'id, order_number, user_id, customer_name, customer_email, customer_phone, pickup_date, pickup_time, special_instructions, subtotal, status, created_at, updated_at',
          )
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .order('id')
          .range(offset, offset + 999)
          .returns<Order[]>();
        if (error || !data) throw new Error('Orders unavailable');
        all.push(...data.map((order) => ({ ...order, subtotal: orderAmount(order.subtotal) })));
        if (data.length < 1000) break;
      }
      if (revision === this.listRevision && userId === this.auth.currentUser()?.id)
        this.orderState.set(all);
    } catch {
      if (revision === this.listRevision)
        this.errorState.set({
          userId,
          message: 'Your orders couldn’t be loaded. Please try again.',
        });
    } finally {
      if (revision === this.listRevision) this.loadingUser.set(null);
    }
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) throw new Error('Please sign in to view your order.');
    const { data, error } = await this.client
      .from('order_items')
      .select('id, order_id, product_id, product_name, quantity, unit_price, total, created_at')
      .eq('order_id', orderId)
      .order('created_at')
      .returns<OrderItem[]>();
    if (error || !data || this.auth.currentUser()?.id !== userId)
      throw new Error('The items in this order couldn’t be loaded. Please try again.');
    return data.map((item) => ({
      ...item,
      unit_price: orderAmount(item.unit_price),
      total: orderAmount(item.total),
    }));
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return null;
    const { data, error } = await this.client
      .from('orders')
      .select(
        'id, order_number, user_id, customer_name, customer_email, customer_phone, pickup_date, pickup_time, special_instructions, subtotal, status, created_at, updated_at',
      )
      .eq('user_id', userId)
      .eq('order_number', orderNumber)
      .maybeSingle<Order>();
    if (error) throw new Error('We couldn’t load this order. Please try again.');
    if (!data || this.auth.currentUser()?.id !== userId) return null;
    return { ...data, subtotal: orderAmount(data.subtotal) };
  }
}
