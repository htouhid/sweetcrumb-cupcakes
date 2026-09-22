import { CurrencyPipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { ProductService } from '../../core/services/product.service';
import { OrderPlacementError, OrderService } from '../../core/services/order.service';
import { ProductImageComponent } from '../../shared/components/product-image/product-image.component';
import { CatalogStatusComponent } from '../../shared/components/catalog-status/catalog-status.component';
import { nonBlank } from '../auth/auth-form.validators';
import { localToday, pickupDateValidator } from './checkout.validators';
@Component({
  selector: 'app-checkout',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    ProductImageComponent,
    CatalogStatusComponent,
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
})
export class CheckoutComponent {
  readonly auth = inject(AuthService);
  readonly cart = inject(CartService);
  readonly catalog = inject(ProductService);
  readonly orders = inject(OrderService);
  private readonly router = inject(Router);
  readonly submitting = signal(false);
  readonly completed = signal(false);
  readonly error = signal<string | null>(null);
  readonly uncertain = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    customerName: ['', nonBlank],
    phone: [''],
    pickupDate: ['', [Validators.required, pickupDateValidator]],
    pickupTime: ['', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
    specialInstructions: ['', Validators.maxLength(500)],
  });
  get today() {
    return localToday();
  }
  constructor() {
    effect(() => {
      const profile = this.auth.profile();
      if (profile && !this.form.controls.customerName.dirty)
        this.form.controls.customerName.setValue(
          `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(),
        );
    });
  }
  invalid(name: keyof typeof this.form.controls) {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }
  async submit() {
    if (this.submitting() || this.orders.placingOrder() || this.completed() || this.uncertain())
      return;
    this.form.controls.pickupDate.updateValueAndValidity();
    this.form.markAllAsTouched();
    this.error.set(null);
    if (this.form.invalid) return;
    if (this.catalog.loading() || this.catalog.error() || !this.catalog.loaded()) {
      this.error.set('Please wait until the current collection is available.');
      return;
    }
    if (!this.cart.lines().length) {
      this.error.set('Your order is empty. Choose a treat before checking out.');
      return;
    }
    if (this.cart.needsInventoryReview()) {
      this.error.set(
        'Availability has changed. Please return to your cart and adjust the highlighted quantities.',
      );
      return;
    }
    if (!this.auth.isAuthenticated()) {
      await this.router.navigate(['/sign-in'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    this.submitting.set(true);
    this.uncertain.set(false);
    const value = this.form.getRawValue();
    try {
      const result = await this.orders.placeOrder({
        items: this.cart
          .lines()
          .map((line) => ({ product_id: line.product.id, quantity: line.quantity })),
        customer_name: value.customerName,
        customer_phone: value.phone,
        pickup_date: value.pickupDate,
        pickup_time: value.pickupTime,
        special_instructions: value.specialInstructions,
      });
      this.completed.set(true);
      this.cart.clear();
      // A refresh/navigation failure must never turn an accepted order into a retryable submission.
      void this.catalog.loadProducts(true);
      await this.router.navigate(['/order-confirmation', result.order_number]);
    } catch (error) {
      if (this.completed()) {
        this.error.set('Your order was received. You can find it in My Orders.');
        return;
      }
      this.error.set(
        error instanceof OrderPlacementError
          ? error.message
          : 'We couldn’t confirm your order. Please check My Orders before trying again.',
      );
      this.uncertain.set(!(error instanceof OrderPlacementError) || error.uncertain);
      if (error instanceof OrderPlacementError && error.inventoryRelated) {
        this.cart.preserveForInventoryReview();
        await this.catalog.loadProducts(true);
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
