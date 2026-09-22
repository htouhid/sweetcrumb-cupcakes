import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ProductImageComponent } from '../../shared/components/product-image/product-image.component';
import { QuantitySelectorComponent } from '../../shared/components/quantity-selector/quantity-selector.component';
@Component({
  selector: 'app-cart',
  imports: [CurrencyPipe, RouterLink, ProductImageComponent, QuantitySelectorComponent],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})
export class CartComponent {
  readonly cart = inject(CartService);
}
