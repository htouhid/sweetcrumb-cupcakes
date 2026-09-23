import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AdminService } from '../../core/services/admin.service';
import { Order } from '../../core/models/order';
import { AdminOrderDetailComponent } from './admin-order-detail.component';

const order = {
  id: 'one',
  order_number: 'SC-ONE',
  status: 'received',
  subtotal: 9,
  created_at: '2026-09-22',
  pickup_date: '2026-09-23',
  pickup_time: '12:00:00',
  customer_name: 'Avery',
} as Order;
describe('Admin order workflow confirmation', () => {
  const orders = signal([order]);
  const updateOrderStatus = vi.fn();
  beforeEach(() => {
    orders.set([order]);
    updateOrderStatus.mockReset();
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
            updatingOrderId: signal(null),
            getOrderItems: vi.fn().mockResolvedValue([]),
            updateOrderStatus,
          },
        },
      ],
    });
  });
  async function setup() {
    const fixture = TestBed.createComponent(AdminOrderDetailComponent);
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => dialog.removeAttribute('open'));
    const trigger = fixture.nativeElement.querySelector('.workflow button') as HTMLButtonElement;
    return { fixture, dialog, trigger, component: fixture.componentInstance };
  }
  it('requires confirmation, supports dismissal, and exposes no cancellation action', async () => {
    const { fixture, dialog, trigger, component } = await setup();
    trigger.click();
    await fixture.whenStable();
    expect(dialog.showModal).toHaveBeenCalled();
    expect(dialog.textContent).toContain('Confirm this SweetCrumb order?');
    expect(dialog.getAttribute('aria-labelledby')).toBe('confirmation-title');
    expect(updateOrderStatus).not.toHaveBeenCalled();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(dialog.close).toHaveBeenCalled();
    expect(component.selectedAction()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(fixture.nativeElement.textContent).not.toContain('Cancel Order');
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
  });
  it('disables actions while running then displays the new authoritative status', async () => {
    const { fixture, dialog, trigger, component } = await setup();
    let finish!: (value: unknown) => void;
    updateOrderStatus.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    trigger.click();
    await fixture.whenStable();
    const pending = component.confirmStatusChange();
    await fixture.whenStable();
    expect(trigger.disabled).toBe(true);
    expect(dialog.querySelector<HTMLButtonElement>('.button-primary')?.disabled).toBe(true);
    await component.confirmStatusChange();
    expect(updateOrderStatus).toHaveBeenCalledExactlyOnceWith('one', 'confirmed');
    expect(component.order()?.status).toBe('received');
    orders.set([{ ...order, status: 'confirmed' }]);
    finish({ order_id: 'one', order_number: 'SC-ONE', status: 'confirmed' });
    await pending;
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Order SC-ONE is now Confirmed.');
    expect(fixture.nativeElement.querySelector('.workflow button')?.textContent).toContain(
      'Start Preparing',
    );
    expect(dialog.close).toHaveBeenCalled();
  });
  it('keeps the existing status on failure and sanitizes the error', async () => {
    const { fixture, trigger, component } = await setup();
    updateOrderStatus.mockRejectedValue(new Error('private diagnostic'));
    trigger.click();
    await component.confirmStatusChange();
    await fixture.whenStable();
    expect(component.order()?.status).toBe('received');
    expect(fixture.nativeElement.textContent).toContain('Review the refreshed status');
    expect(fixture.nativeElement.textContent).not.toContain('private diagnostic');
    expect(fixture.nativeElement.querySelector('.workflow button')?.textContent).toContain(
      'Confirm Order',
    );
  });
  it('removes the action for both terminal statuses', async () => {
    const { fixture } = await setup();
    for (const status of ['completed', 'cancelled'] as const) {
      orders.set([{ ...order, status }]);
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('.workflow button')).toBeNull();
    }
  });
  it('does not access a destroyed dialog if access changes during the RPC', async () => {
    const { fixture, trigger, component } = await setup();
    let reject!: (error: Error) => void;
    updateOrderStatus.mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
    );
    trigger.click();
    const pending = component.confirmStatusChange();
    fixture.destroy();
    reject(new Error('Session expired'));
    await expect(pending).resolves.toBeUndefined();
  });
});
