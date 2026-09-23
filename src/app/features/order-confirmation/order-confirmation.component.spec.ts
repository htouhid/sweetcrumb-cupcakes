import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { OrderEmailStatus } from '../../core/models/order-email';
import { OrderConfirmationComponent } from './order-confirmation.component';

describe('Order confirmation notifications', () => {
  it('shows a non-blocking note for email failure while retaining order success', async () => {
    const status = signal<OrderEmailStatus | null>(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ orderNumber: 'SC-TEST' })) },
        },
        {
          provide: AuthService,
          useValue: { currentUser: signal({ id: 'user' }), firstName: () => 'Avery' },
        },
        {
          provide: OrderService,
          useValue: {
            lastResult: () => ({
              order_id: 'order',
              order_number: 'SC-TEST',
              status: 'received',
              subtotal: 9,
            }),
            emailStatusFor: () => status(),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(OrderConfirmationComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Your order is in!');
    expect(fixture.nativeElement.querySelector('.notification-note')).toBeNull();
    status.set({ state: 'partial', customerEmailSent: false, adminEmailSent: true });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(
      "Your order was placed successfully, but we couldn't send all email notifications.",
    );
    expect(fixture.nativeElement.textContent).toContain('SC-TEST');
    expect(fixture.nativeElement.querySelector('a[href="/account"]')).toBeTruthy();
    status.set({ state: 'sent', customerEmailSent: true, adminEmailSent: true });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.notification-note')).toBeNull();
  });
});
