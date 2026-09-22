import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { ProductImageComponent } from '../../shared/components/product-image/product-image.component';
@Component({
  selector: 'app-home',
  imports: [RouterLink, ProductCardComponent, ProductImageComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  readonly catalog = inject(ProductService);
}
