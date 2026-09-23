import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AdminService } from '../../core/services/admin.service';
import { Order } from '../../core/models/order';
import { AdminOrdersComponent } from './admin-orders.component';
import { AdminOrderDetailComponent } from './admin-order-detail.component';

const order: Order = {
  id: 'one',
  order_number: 'SC-ONE',
  user_id: 'customer',
  customer_name: 'Avery',
  customer_email: 'avery@example.test',
  customer_phone: null,
  pickup_date: '2026-10-01',
  pickup_time: '14:30:00',
  special_instructions: 'A birthday treat',
  subtotal: 8.5,
  status: 'received',
  created_at: '2026-09-22T12:00:00Z',
  updated_at: '2026-09-22T12:00:00Z',
};
describe('Admin orders and details', () => {
  const orders = signal<readonly Order[]>([order, { ...order, id: 'two', status: 'ready' }]);
  const getOrderItems = vi.fn();
  const getOrders = vi.fn();
  beforeEach(() => {
    orders.set([order, { ...order, id: 'two', status: 'ready' }]);
    getOrderItems.mockReset().mockResolvedValue([
      {
        id: 'line',
        product_name: 'Historical Vanilla',
        quantity: 2,
        unit_price: 4.25,
        total: 8.5,
      },
    ]);
    getOrders.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'one' })) } },
        {
          provide: AdminService,
          useValue: {
            orders,
            loading: signal(false),
            error: signal(null),
            getOrderItems,
            getOrders,
            updatingOrderId: signal(null),
          },
        },
      ],
    });
  });
  it('filters orders locally without additional requests', async () => {
    const fixture = TestBed.createComponent(AdminOrdersComponent);
    await fixture.whenStable();
    expect(fixture.componentInstance.filteredOrders()).toHaveLength(2);
    fixture.componentInstance.statusFilter.set('ready');
    await fixture.whenStable();
    expect(fixture.componentInstance.filteredOrders().map((order) => order.id)).toEqual(['two']);
    expect(fixture.nativeElement.querySelectorAll('.order-row')).toHaveLength(1);
    fixture.componentInstance.statusFilter.set('completed');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No orders with this status');
    expect(getOrders).toHaveBeenCalledTimes(1);
  });
  it('renders historical names, quantities, prices and totals, with no status editor', async () => {
    const fixture = TestBed.createComponent(AdminOrderDetailComponent);
    await fixture.whenStable();
    expect(getOrderItems).toHaveBeenCalledWith('one');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Historical Vanilla');
    expect(text).toContain('Quantity: 2');
    expect(text).toContain('$4.25');
    expect(text).toContain('$8.50');
    expect(text).toContain('A birthday treat');
    expect(text).toContain('Received');
    expect(text).toContain('2:30 PM');
    expect(fixture.nativeElement.querySelector('select, input')).toBeNull();
  });
  it('shows a friendly missing-order state for a direct unknown URL', async () => {
    orders.set([]);
    const fixture = TestBed.createComponent(AdminOrderDetailComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('We couldn’t find this order');
    expect(getOrderItems).not.toHaveBeenCalled();
  });
});
