import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
@Component({
  selector: 'app-shop',
  imports: [RouterLink, ProductCardComponent],
  template: `<section class="container section shop">
    <div class="section-heading centered">
      <p class="eyebrow">A LITTLE SOMETHING TO MAKE YOUR DAY</p>
      <h1>The sweet collection</h1>
      <p>Handcrafted favorites, baked for your happiest moments.</p>
    </div>
    <nav class="filters" aria-label="Filter by category">
      <a
        routerLink="/shop"
        [class.selected]="selectedFilter() === 'all'"
        [attr.aria-current]="selectedFilter() === 'all' ? 'page' : null"
        >All</a
      >
      @for (category of catalog.categories; track category.slug) {
        <a
          [routerLink]="['/shop', category.slug]"
          [class.selected]="selectedFilter() === category.slug"
          [attr.aria-current]="selectedFilter() === category.slug ? 'page' : null"
          >{{ category.name }}</a
        >
      }
    </nav>
    <p class="results" aria-live="polite">
      {{ filteredProducts().length }} lovely treats{{
        selectedFilter() === 'all' ? '' : ' · ' + catalog.categoryName(selectedFilter())
      }}
    </p>
    <div class="product-grid">
      @for (product of filteredProducts(); track product.id) {
        <app-product-card [product]="product" />
      } @empty {
        <div class="empty-state">
          <h2>No treats in this collection yet.</h2>
          <a routerLink="/shop" class="button button-primary">Explore all treats</a>
        </div>
      }
    </div>
  </section>`,
  styles: [
    `
      .shop {
        min-height: 65vh;
      }
      h1 {
        font-size: clamp(40px, 5vw, 60px);
        margin: 15px 0;
      }
      .filters {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 35px;
      }
      .filters a {
        padding: 12px 22px;
        border: 1px solid var(--line);
        border-radius: 30px;
        font-size: 13px;
        text-decoration: none;
      }
      .filters a.selected {
        background: var(--berry);
        color: white;
        border-color: var(--berry);
      }
      .results {
        color: var(--muted);
        font-size: 12px;
        margin-bottom: 24px;
      }
    `,
  ],
})
export class ShopComponent {
  readonly catalog = inject(ProductService);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  readonly selectedFilter = computed(() => this.params()?.get('category') ?? 'all');
  readonly filteredProducts = computed(() =>
    this.catalog.products.filter(
      (product) => this.selectedFilter() === 'all' || product.category === this.selectedFilter(),
    ),
  );
}
