import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { OrderPlacementError, OrderService } from './order.service';
import {
  isActiveOrder,
  Order,
  ORDER_STATUS_LABELS,
  OrderStatus,
  PlaceOrderRequest,
} from '../models/order';

const result = {
  order_id: 'order-1',
  order_number: 'SC-20260922-123456',
  subtotal: 9,
  status: 'received',
};
const request: PlaceOrderRequest = {
  items: [{ product_id: 'product-1', quantity: 2 }],
  customer_name: ' Avery Baker ',
  customer_phone: '',
  pickup_date: '2027-01-01',
  pickup_time: '12:00',
  special_instructions: '',
};

describe('OrderService', () => {
  const user = signal<{ id: string } | null>({ id: 'customer-1' });
  const rpc = vi.fn();
  const invoke = vi.fn();
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    returns: vi.fn(),
    maybeSingle: vi.fn(),
  };
  beforeEach(() => {
    user.set({ id: 'customer-1' });
    invoke
      .mockReset()
      .mockResolvedValue({
        data: { customer_email_sent: true, admin_email_sent: true },
        error: null,
      });
    rpc.mockReset().mockResolvedValue({ data: result, error: null });
    for (const method of Object.values(query)) method.mockReset().mockReturnValue(query);
    query.returns.mockResolvedValue({ data: [], error: null });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { currentUser: user, initialize: () => Promise.resolve() },
        },
        {
          provide: SupabaseService,
          useValue: {
            client: { rpc, functions: { invoke }, from: vi.fn().mockReturnValue(query) },
          },
        },
      ],
    });
  });

  it('invokes the deployed function with only order_id and tracks success independently', async () => {
    const service = TestBed.inject(OrderService);
    await service.placeOrder(request);
    expect(await service.sendOrderEmails('order-1')).toEqual({
      state: 'sent',
      customerEmailSent: true,
      adminEmailSent: true,
    });
    expect(invoke).toHaveBeenCalledExactlyOnceWith('send-order-emails', {
      body: { order_id: 'order-1' },
      timeout: 45000,
    });
    expect(service.lastResult()).toEqual(result);
    expect(service.error()).toBeNull();
    expect(service.emailStatusFor('order-1')?.state).toBe('sent');
    user.set({ id: 'other-customer' });
    expect(service.emailStatusFor('order-1')).toBeNull();
  });
  it('handles partial 207 and HTTP-error bodies without leaking technical details', async () => {
    const service = TestBed.inject(OrderService);
    invoke.mockResolvedValueOnce({
      data: {
        customer_email_sent: false,
        admin_email_sent: true,
        message: 'private provider detail',
      },
      error: null,
    });
    expect(await service.sendOrderEmails('order-1')).toEqual({
      state: 'partial',
      customerEmailSent: false,
      adminEmailSent: true,
    });
    invoke.mockResolvedValueOnce({
      data: null,
      error: {
        context: new Response(
          JSON.stringify({
            customer_email_sent: false,
            admin_email_sent: false,
            error: 'private provider detail',
          }),
          { status: 502 },
        ),
      },
    });
    expect(await service.sendOrderEmails('order-1')).toEqual({
      state: 'failed',
      customerEmailSent: false,
      adminEmailSent: false,
    });
    expect(JSON.stringify(service.emailStatusFor('order-1'))).not.toContain(
      'private provider detail',
    );
  });
  it('resolves transport and malformed-response failures without changing an accepted order', async () => {
    const service = TestBed.inject(OrderService);
    await service.placeOrder(request);
    for (const payload of [
      null,
      { success: true },
      {
        customer_email_sent: false,
        admin_email_sent: false,
        customer_email: { status: 'unknown' },
      },
    ]) {
      invoke.mockResolvedValueOnce({ data: payload, error: null });
      expect((await service.sendOrderEmails('order-1')).state).toBe('unknown');
    }
    invoke.mockRejectedValueOnce(new Error('private transport detail'));
    expect((await service.sendOrderEmails('order-1')).state).toBe('unknown');
    expect(service.lastResult()).toEqual(result);
    expect(service.placingOrder()).toBe(false);
    expect(service.error()).toBeNull();
  });
  it('uses the development helper only for a verified existing customer order', async () => {
    const service = TestBed.inject(OrderService);
    const id = '11111111-1111-4111-8111-111111111111';
    query.maybeSingle.mockResolvedValueOnce({ data: { id, user_id: 'customer-1' }, error: null });
    await service.sendOrderEmailsForDevelopment(id);
    expect(query.eq).toHaveBeenCalledWith('id', id);
    expect(query.eq).toHaveBeenCalledWith('user_id', 'customer-1');
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalled();
    query.maybeSingle.mockResolvedValueOnce({ data: { id, user_id: 'other' }, error: null });
    await expect(service.sendOrderEmailsForDevelopment(id)).rejects.toThrow(
      'could not be verified',
    );
    await expect(service.sendOrderEmailsForDevelopment('SC-NOT-A-UUID')).rejects.toThrow('UUID');
    user.set(null);
    await expect(service.sendOrderEmailsForDevelopment(id)).rejects.toThrow('Sign in');
    expect(invoke).toHaveBeenCalledTimes(1);
  });
  it('calls only place_order with an explicit price-free payload', async () => {
    const service = TestBed.inject(OrderService);
    const untrusted = {
      ...request,
      subtotal: 0.01,
      items: [{ product_id: 'product-1', quantity: 2, price: 0.01, subtotal: 0.02 }],
    };
    expect(await service.placeOrder(untrusted)).toEqual(result);
    expect(rpc).toHaveBeenCalledExactlyOnceWith('place_order', {
      p_items: [{ product_id: 'product-1', quantity: 2 }],
      p_customer_name: 'Avery Baker',
      p_customer_phone: null,
      p_pickup_date: '2027-01-01',
      p_pickup_time: '12:00',
      p_special_instructions: null,
    });
    expect(service.lastResult()).toEqual(result);
    expect(service.placingOrder()).toBe(false);
    user.set(null);
    expect(service.lastResult()).toBeNull();
  });
  it('rejects unauthenticated and empty requests without calling the RPC', async () => {
    const service = TestBed.inject(OrderService);
    await expect(service.placeOrder({ ...request, items: [] })).rejects.toThrow();
    user.set(null);
    await expect(service.placeOrder(request)).rejects.toThrow('sign in');
    expect(rpc).not.toHaveBeenCalled();
  });
  it('blocks concurrent placement and releases the lock afterward', async () => {
    let resolve!: (value: unknown) => void;
    rpc.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const service = TestBed.inject(OrderService);
    const pending = service.placeOrder(request);
    expect(service.placingOrder()).toBe(true);
    await expect(service.placeOrder(request)).rejects.toThrow('already');
    resolve({ data: result, error: null });
    await pending;
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(service.placingOrder()).toBe(false);
  });
  it('recognizes inventory conflicts without exposing unrelated server messages', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'Not enough inventory for Peanut Butter Chocolate. Only 2 available.' },
    });
    const service = TestBed.inject(OrderService);
    await expect(service.placeOrder(request)).rejects.toMatchObject({
      inventoryRelated: true,
      uncertain: false,
    });
    rpc.mockRejectedValue(new Error('internal diagnostic'));
    await expect(service.placeOrder(request)).rejects.toMatchObject({ uncertain: true });
    try {
      await service.placeOrder(request);
    } catch (error) {
      expect((error as OrderPlacementError).message).not.toContain('internal diagnostic');
    }
  });
  it('queries the current user newest-first and separates active/history orders', async () => {
    const statuses: OrderStatus[] = [
      'received',
      'confirmed',
      'preparing',
      'ready',
      'completed',
      'cancelled',
    ];
    query.returns.mockResolvedValue({
      data: statuses.map((status, index) => ({
        id: `${index}`,
        user_id: 'customer-1',
        status,
        subtotal: '9.50',
      })),
      error: null,
    });
    const service = TestBed.inject(OrderService);
    await service.getMyOrders();
    expect(query.eq).toHaveBeenCalledWith('user_id', 'customer-1');
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(service.activeOrders()).toHaveLength(4);
    expect(service.orderHistory()).toHaveLength(2);
    expect(service.orders()[0].subtotal).toBe(9.5);
    user.set({ id: 'another-customer' });
    expect(service.orders()).toEqual([]);
  });
  it('loads historical item prices and handles read failures', async () => {
    query.returns.mockResolvedValue({
      data: [
        {
          id: 'item-1',
          order_id: 'order-1',
          product_name: 'Original Cake',
          quantity: 2,
          unit_price: '4.25',
          total: '8.50',
        },
      ],
      error: null,
    });
    const service = TestBed.inject(OrderService);
    const items = await service.getOrderItems('order-1');
    expect(query.eq).toHaveBeenCalledWith('order_id', 'order-1');
    expect(items[0]).toMatchObject({ product_name: 'Original Cake', unit_price: 4.25, total: 8.5 });
    query.returns.mockResolvedValue({ data: null, error: {} });
    await service.getMyOrders();
    expect(service.error()).toBeTruthy();
    expect(service.loading()).toBe(false);
  });
  it('reloads confirmation by order number and customer ID', async () => {
    query.maybeSingle.mockResolvedValue({
      data: {
        id: 'order-1',
        order_number: result.order_number,
        subtotal: '9.00',
        user_id: 'customer-1',
        status: 'received',
      },
      error: null,
    });
    const order = await TestBed.inject(OrderService).getOrderByNumber(result.order_number);
    expect(query.eq).toHaveBeenCalledWith('order_number', result.order_number);
    expect(query.eq).toHaveBeenCalledWith('user_id', 'customer-1');
    expect(order?.subtotal).toBe(9);
  });
});

describe('order presentation', () => {
  it('classifies all statuses and provides friendly labels', () => {
    expect(ORDER_STATUS_LABELS).toEqual({
      received: 'Received',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      ready: 'Ready for Pickup',
      completed: 'Completed',
      cancelled: 'Cancelled',
    });
    for (const status of ['received', 'confirmed', 'preparing', 'ready'] as const)
      expect(isActiveOrder({ status })).toBe(true);
    for (const status of ['completed', 'cancelled'] as const)
      expect(isActiveOrder({ status })).toBe(false);
  });
});
