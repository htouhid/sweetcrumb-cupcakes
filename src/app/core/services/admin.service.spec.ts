import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { AdminService } from './admin.service';
import { OrderStatus } from '../models/order';

describe('AdminService', () => {
  const user = signal<{ id: string } | null>({ id: 'admin-id' });
  const admin = signal(true);
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(), returns: vi.fn() };
  const from = vi.fn();
  const rpc = vi.fn();
  const update = vi.fn();
  beforeEach(() => {
    user.set({ id: 'admin-id' });
    rpc.mockReset();
    update.mockReset();
    admin.set(true);
    for (const method of Object.values(query)) method.mockReset().mockReturnValue(query);
    query.returns.mockResolvedValue({ data: [], error: null });
    from.mockReset().mockReturnValue({ ...query, update });
    TestBed.configureTestingModule({
      providers: [
        AdminService,
        { provide: AuthService, useValue: { currentUser: user, isAdmin: admin } },
        { provide: SupabaseService, useValue: { client: { from, rpc } } },
      ],
    });
  });
  it('reads all orders using the existing authenticated client, newest first', async () => {
    query.returns.mockResolvedValue({
      data: [{ id: 'one', customer_name: 'Customer', subtotal: '12.50', status: 'received' }],
      error: null,
    });
    const service = TestBed.inject(AdminService);
    await service.getOrders();
    expect(from).toHaveBeenCalledExactlyOnceWith('orders');
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(query.eq).not.toHaveBeenCalled();
    expect(service.orders()[0].subtotal).toBe(12.5);
  });
  it('derives real summary counts including zero categories', async () => {
    const service = TestBed.inject(AdminService);
    await service.getOrders();
    expect(service.summary()).toEqual({ newOrders: 0, preparing: 0, ready: 0, completed: 0 });
    const statuses: OrderStatus[] = [
      'received',
      'confirmed',
      'received',
      'preparing',
      'ready',
      'completed',
      'cancelled',
    ];
    query.returns.mockResolvedValue({
      data: statuses.map((status, index) => ({ id: String(index), status, subtotal: 9 })),
      error: null,
    });
    await service.getOrders();
    expect(service.summary()).toEqual({ newOrders: 3, preparing: 1, ready: 1, completed: 1 });
    expect(service.recentOrders().map((order) => order.id)).toEqual(['0', '1', '2', '3', '4']);
  });
  it('reads historical item values through RLS and never current product data', async () => {
    query.returns.mockResolvedValue({
      data: [
        {
          id: 'item',
          product_name: 'Original Cake',
          quantity: 2,
          unit_price: '4.25',
          total: '8.50',
        },
      ],
      error: null,
    });
    const items = await TestBed.inject(AdminService).getOrderItems('order-one');
    expect(from).toHaveBeenCalledExactlyOnceWith('order_items');
    expect(query.eq).toHaveBeenCalledWith('order_id', 'order-one');
    expect(items[0]).toMatchObject({ product_name: 'Original Cake', unit_price: 4.25, total: 8.5 });
  });
  it('rejects non-admin reads and hides cached data on an account change', async () => {
    const service = TestBed.inject(AdminService);
    query.returns.mockResolvedValue({
      data: [{ id: 'one', status: 'received', subtotal: 5 }],
      error: null,
    });
    await service.getOrders();
    expect(service.orders()).toHaveLength(1);
    user.set({ id: 'different-user' });
    expect(service.orders()).toEqual([]);
    admin.set(false);
    await service.getOrders();
    await expect(service.getOrderItems('one')).rejects.toThrow('Administrator access');
    expect(from).toHaveBeenCalledTimes(1);
  });
  it('ignores an in-flight response after the admin role is lost', async () => {
    let resolve!: (value: unknown) => void;
    query.returns.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const service = TestBed.inject(AdminService);
    const pending = service.getOrders();
    admin.set(false);
    resolve({ data: [{ id: 'one', status: 'received', subtotal: 5 }], error: null });
    await pending;
    expect(service.orders()).toEqual([]);
  });
  it('shows a sanitized error and permits retry', async () => {
    const service = TestBed.inject(AdminService);
    query.returns.mockResolvedValueOnce({ data: null, error: { message: 'private diagnostic' } });
    await service.getOrders();
    expect(service.error()).toBeTruthy();
    expect(service.error()).not.toContain('private diagnostic');
    expect(service.loading()).toBe(false);
    await service.getOrders();
    expect(service.error()).toBeNull();
    expect(service.orders()).toEqual([]);
  });
  it('loads beyond the API row limit', async () => {
    query.returns
      .mockResolvedValueOnce({
        data: Array.from({ length: 1000 }, (_, id) => ({
          id: String(id),
          status: 'received',
          subtotal: 5,
        })),
        error: null,
      })
      .mockResolvedValueOnce({ data: [{ id: 'last', status: 'ready', subtotal: 6 }], error: null });
    const service = TestBed.inject(AdminService);
    await service.getOrders();
    expect(service.orders()).toHaveLength(1001);
    expect(query.range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });
  it('uses only the status RPC and refreshes counts from authoritative orders', async () => {
    const service = TestBed.inject(AdminService);
    query.returns.mockResolvedValue({
      data: [{ id: 'one', status: 'confirmed', subtotal: 9 }],
      error: null,
    });
    await service.getOrders();
    expect(service.summary().newOrders).toBe(1);
    const result = {
      order_id: 'one',
      order_number: 'SC-ONE',
      previous_status: 'confirmed',
      status: 'preparing',
      updated_at: '2026-09-22T12:00:00Z',
    };
    rpc.mockResolvedValue({ data: result, error: null });
    query.returns.mockResolvedValue({
      data: [{ id: 'one', status: 'preparing', subtotal: 9 }],
      error: null,
    });
    expect(await service.updateOrderStatus('one', 'preparing')).toEqual(result);
    expect(rpc).toHaveBeenCalledExactlyOnceWith('update_order_status', {
      p_order_id: 'one',
      p_new_status: 'preparing',
    });
    expect(update).not.toHaveBeenCalled();
    expect(service.orders()[0].status).toBe('preparing');
    expect(service.summary()).toEqual({ newOrders: 0, preparing: 1, ready: 0, completed: 0 });
    expect(service.updatingOrderId()).toBeNull();
  });
  it('does not update optimistically and blocks duplicate submissions', async () => {
    const service = TestBed.inject(AdminService);
    query.returns.mockResolvedValue({
      data: [{ id: 'one', status: 'received', subtotal: 9 }],
      error: null,
    });
    await service.getOrders();
    let resolve!: (value: unknown) => void;
    rpc.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const pending = service.updateOrderStatus('one', 'confirmed');
    expect(service.orders()[0].status).toBe('received');
    expect(service.updatingOrderId()).toBe('one');
    await expect(service.updateOrderStatus('one', 'confirmed')).rejects.toThrow(
      'already in progress',
    );
    query.returns.mockResolvedValue({
      data: [{ id: 'one', status: 'preparing', subtotal: 9 }],
      error: null,
    });
    resolve({ data: null, error: { message: 'private database diagnostic' } });
    await expect(pending).rejects.toThrow('may have changed elsewhere');
    expect(service.orders()[0].status).toBe('preparing');
    expect(service.updatingOrderId()).toBeNull();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
  });
  it('rejects cancellation and non-admin mutations without sending them to the RPC', async () => {
    const service = TestBed.inject(AdminService);
    await expect(service.updateOrderStatus('one', 'cancelled' as never)).rejects.toThrow(
      'not available',
    );
    admin.set(false);
    await expect(service.updateOrderStatus('one', 'confirmed')).rejects.toThrow('administrator');
    expect(rpc).not.toHaveBeenCalled();
  });
});
