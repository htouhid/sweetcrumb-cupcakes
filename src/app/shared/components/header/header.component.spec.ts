import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { HeaderComponent } from './header.component';

describe('Admin header access', () => {
  it('shows the dashboard link only to an authenticated admin', async () => {
    const isAdmin = signal(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAdmin,
            isAuthenticated: signal(true),
            authLoading: signal(false),
            firstName: () => 'Avery',
          },
        },
        { provide: CartService, useValue: { totalQuantity: signal(2) } },
      ],
    });
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.componentInstance.accountOpen.set(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Admin Dashboard');
    isAdmin.set(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('a[href="/admin"]')?.textContent).toContain(
      'Admin Dashboard',
    );
    expect(
      fixture.nativeElement.querySelector('a[href="/cart"]')?.getAttribute('aria-label'),
    ).toContain('2 items');
    isAdmin.set(false);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('a[href="/admin"]')).toBeNull();
  });
});
