import { CurrencyPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../../core/models/product';
import { CartService } from '../../../core/services/cart.service';
import { ProductService } from '../../../core/services/product.service';
import { ProductImageComponent } from '../product-image/product-image.component';
@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe, RouterLink, ProductImageComponent],
  template: `<article class="product-card">
    <a
      class="product-visual"
      [routerLink]="['/product', product().slug]"
      [attr.aria-label]="'View ' + product().name"
      ><app-product-image [src]="product().image" [alt]="product().name" />
      @if (product().featured) {
        <span class="badge">BAKERY FAVORITE</span>
      }
    </a>
    <div class="product-copy">
      <span class="eyebrow">{{ catalog.categoryName(product().category) }}</span>
      <h3>
        <a [routerLink]="['/product', product().slug]">{{ product().name }}</a>
      </h3>
      <p>{{ product().description }}</p>
      <div class="price-row">
        <strong>{{ product().price | currency }}</strong
        ><small [class.sold-out]="!product().available || product().inventoryQuantity === 0">{{
          !product().available || product().inventoryQuantity === 0
            ? 'Sold Out'
            : product().inventoryQuantity <= 5
              ? 'Only ' + product().inventoryQuantity + ' available'
              : 'Freshly baked'
        }}</small>
      </div>
      <button
        class="button button-outline"
        (click)="cart.addItem(product())"
        [disabled]="cart.remaining(product()) === 0"
      >
        {{
          !product().available || product().inventoryQuantity === 0
            ? 'Sold Out'
            : cart.remaining(product()) === 0
              ? 'All available in your order'
              : 'Add to Order'
        }}
        <span aria-hidden="true">+</span>
      </button>
    </div>
  </article>`,
  styleUrl: './product-card.component.scss',
})
export class ProductCardComponent {
  readonly product = input.required<Product>();
  readonly cart = inject(CartService);
  readonly catalog = inject(ProductService);
}
