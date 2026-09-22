import { CatalogStatusComponent } from '../../shared/components/catalog-status/catalog-status.component';
import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { ProductImageComponent } from '../../shared/components/product-image/product-image.component';
import { QuantitySelectorComponent } from '../../shared/components/quantity-selector/quantity-selector.component';
@Component({
  selector: 'app-product-detail',
  imports: [
    CatalogStatusComponent,
    CurrencyPipe,
    RouterLink,
    ProductImageComponent,
    QuantitySelectorComponent,
  ],
  template: `<section class="container section">
    @if (catalog.loading() || catalog.error()) {
      <app-catalog-status
        [loading]="catalog.loading()"
        [error]="catalog.error()"
        (retry)="catalog.loadProducts(true)"
      />
    } @else if (product(); as item) {
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a routerLink="/shop">Shop</a><span>/</span
        ><a [routerLink]="['/shop', item.category]">{{ catalog.categoryName(item.category) }}</a
        ><span>/</span><span>{{ item.name }}</span>
      </nav>
      <div class="detail-grid">
        <div class="detail-image">
          <app-product-image [src]="item.image" [alt]="item.name" [priority]="true" />
        </div>
        <div class="detail-copy">
          <p class="eyebrow">{{ catalog.categoryName(item.category) }}</p>
          <h1>{{ item.name }}</h1>
          <p class="flavor">{{ item.flavor }} · Handcrafted with love</p>
          <p class="description">{{ item.description }}</p>
          <p class="detail-price">{{ item.price | currency }}</p>
          <p class="availability">
            {{
              item.available && item.inventoryQuantity > 0
                ? item.inventoryQuantity <= 5
                  ? 'Only ' + item.inventoryQuantity + ' available'
                  : item.inventoryQuantity + ' available from our bakery'
                : 'Sold Out · back soon'
            }}
          </p>
          <div class="order-controls">
            @if (remaining() > 0) {
              <app-quantity-selector
                [value]="quantity()"
                [max]="remaining()"
                (valueChange)="quantity.set($event)"
                [label]="item.name + ' quantity'"
              />
            }
            <button
              class="button button-primary"
              [disabled]="remaining() === 0"
              (click)="cart.addItem(item, quantity())"
            >
              {{
                !item.available || item.inventoryQuantity === 0
                  ? 'Sold Out'
                  : remaining() === 0
                    ? 'All available in your order'
                    : 'Add to Order'
              }}
              <span aria-hidden="true">+</span>
            </button>
          </div>
          @if (cart.quantityFor(item.id) > 0) {
            <p class="in-order">
              {{ cart.quantityFor(item.id) }} in your order · <a routerLink="/cart">View order →</a>
            </p>
          }
          <div class="detail-note">
            Small batches. Quality ingredients. A little happiness in every bite.
          </div>
        </div>
      </div>
    } @else {
      <div class="empty-state">
        <p class="eyebrow">A MISSING CRUMB</p>
        <h1>We couldn’t find that treat.</h1>
        <a class="button button-primary" routerLink="/shop">Explore our collection</a>
      </div>
    }
  </section>`,
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent {
  readonly catalog = inject(ProductService);
  readonly cart = inject(CartService);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  readonly product = computed(() => this.catalog.bySlug(this.params()?.get('slug') ?? ''));
  readonly remaining = computed(() => (this.product() ? this.cart.remaining(this.product()!) : 0));
  readonly quantity = linkedSignal(() => Math.min(1, this.remaining()));
}
