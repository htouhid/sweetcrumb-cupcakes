import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { CheckoutComponent } from './checkout.component';
import { CartComponent } from '../cart/cart.component';
import { CartService } from '../../core/services/cart.service';
import { ProductService } from '../../core/services/product.service';
import { AuthService } from '../../core/services/auth.service';
import { OrderPlacementError, OrderService } from '../../core/services/order.service';
import { TEST_PRODUCTS } from '../../core/testing/products.fixture';

const result = {
  order_id: 'order-1',
  order_number: 'SC-20260922-123456',
  subtotal: 4.5,
  status: 'received',
};
describe('Pickup checkout', () => {
  const products = signal(TEST_PRODUCTS);
  const placeOrder = vi.fn();
  const reload = vi.fn();
  const catalog = {
    products,
    loaded: signal(true),
    loading: signal(false),
    error: signal<string | null>(null),
    byId: (id: string) => products().find((p) => p.id === id),
    loadProducts: reload,
  };
  beforeEach(() => {
    localStorage.clear();
    products.set(TEST_PRODUCTS);
    catalog.loading.set(false);
    catalog.error.set(null);
    reload.mockReset().mockResolvedValue(undefined);
    placeOrder.mockReset().mockResolvedValue(result);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ProductService, useValue: catalog },
        {
          provide: AuthService,
          useValue: {
            profile: signal({ first_name: 'Avery', last_name: 'Baker' }),
            currentUser: signal({ id: 'customer-1', email: 'avery@example.test' }),
            isAuthenticated: signal(true),
          },
        },
        { provide: OrderService, useValue: { placeOrder, placingOrder: signal(false) } },
      ],
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });
  function setup(withItem = true) {
    const cart = TestBed.inject(CartService);
    if (withItem) cart.addItem(TEST_PRODUCTS[0]);
    const fixture = TestBed.createComponent(CheckoutComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    return { fixture, component, cart, navigate };
  }
  function valid(component: CheckoutComponent) {
    component.form.patchValue({
      customerName: 'Avery Baker',
      pickupDate: '2099-01-01',
      pickupTime: '12:30',
    });
  }
  it('prefills the name and validates required fields, dates, times, and instructions', async () => {
    const { component } = setup();
    expect(component.form.controls.customerName.value).toBe('Avery Baker');
    await component.submit();
    expect(placeOrder).not.toHaveBeenCalled();
    component.form.patchValue({
      customerName: ' ',
      pickupDate: '2000-01-01',
      pickupTime: '25:00',
      specialInstructions: 'x'.repeat(501),
    });
    expect(component.form.invalid).toBe(true);
    expect(component.form.controls.pickupDate.hasError('pastDate')).toBe(true);
    expect(component.form.controls.specialInstructions.hasError('maxlength')).toBe(true);
    component.form.patchValue({ pickupDate: '2099-02-30' });
    expect(component.form.controls.pickupDate.hasError('invalidDate')).toBe(true);
    valid(component);
    component.form.controls.specialInstructions.setValue('');
    expect(component.form.valid).toBe(true);
  });
  it('does not place an empty order and links back to the shop', async () => {
    const { fixture, component } = setup(false);
    valid(component);
    await component.submit();
    expect(placeOrder).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('a[href="/shop"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Your cart is empty');
  });
  it('links from cart to checkout without placing an order', () => {
    const cart = TestBed.inject(CartService);
    cart.addItem(TEST_PRODUCTS[0]);
    const fixture = TestBed.createComponent(CartComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/checkout"]')?.textContent).toContain(
      'Proceed to Checkout',
    );
    expect(placeOrder).not.toHaveBeenCalled();
  });
  it('clears a successful cart, refreshes inventory, and navigates once', async () => {
    const { component, cart, navigate } = setup();
    valid(component);
    await component.submit();
    await component.submit();
    expect(placeOrder).toHaveBeenCalledTimes(1);
    expect(placeOrder.mock.calls[0][0].items).toEqual([{ product_id: '1', quantity: 1 }]);
    expect(cart.totalQuantity()).toBe(0);
    TestBed.tick();
    expect(localStorage.getItem('sweetcrumb-cart-v1')).toBeNull();
    expect(JSON.parse(localStorage.getItem('sweetcrumb-cart-v1') ?? '[]')).toEqual([]);
    expect(reload).toHaveBeenCalledWith(true);
    expect(navigate).toHaveBeenCalledWith(['/order-confirmation', result.order_number]);
  });
  it('keeps the order after failure and prevents automatic retry after an uncertain result', async () => {
    placeOrder.mockRejectedValue(new OrderPlacementError('Check My Orders', false, true));
    const { component, cart } = setup();
    valid(component);
    await component.submit();
    expect(cart.totalQuantity()).toBe(1);
    expect(component.uncertain()).toBe(true);
    await component.submit();
    expect(placeOrder).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    expect(component.error()).toContain('My Orders');
  });
  it('preserves even a sold-out cart item when refreshing after an inventory rejection', async () => {
    placeOrder.mockRejectedValue(
      new OrderPlacementError('Only 0 available. Please review your cart.', true),
    );
    reload.mockImplementation(async () => {
      products.set([]);
    });
    const { component, cart, navigate } = setup();
    valid(component);
    await component.submit();
    expect(cart.totalQuantity()).toBe(1);
    expect(cart.lines()).toHaveLength(1);
    expect(cart.needsInventoryReview()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledWith(true);
    cart.removeItem('1');
    expect(cart.totalQuantity()).toBe(0);
  });
  it('does not treat navigation failure as a failed order or resubmit it', async () => {
    const { component, cart, navigate } = setup();
    valid(component);
    navigate.mockRejectedValue(new Error('navigation failed'));
    await component.submit();
    await component.submit();
    expect(cart.totalQuantity()).toBe(0);
    expect(placeOrder).toHaveBeenCalledTimes(1);
    expect(component.completed()).toBe(true);
  });
});
