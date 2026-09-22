import { computed, inject, Injectable, signal } from '@angular/core';
import { CATEGORIES } from '../data/categories';
import { Product, ProductRow } from '../models/product';
import { mapProduct } from '../models/product.mapper';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly client = inject(SupabaseService).client;
  private readonly productState = signal<readonly Product[]>([]);
  private readonly loadingState = signal(true);
  private readonly errorState = signal<string | null>(null);
  private readonly loadedState = signal(false);
  readonly products = this.productState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly loaded = this.loadedState.asReadonly();
  readonly categories = CATEGORIES;
  readonly featured = computed(() => this.products().filter((product) => product.featured));
  private request?: Promise<void>;

  constructor() {
    void this.loadProducts();
  }

  /** One shared collection per app session; retries/explicit refreshes can force a reload. */
  loadProducts(force = false): Promise<void> {
    if (this.request) return this.request;
    if (this.loaded() && !force) return Promise.resolve();
    this.request = this.fetchProducts().finally(() => {
      this.request = undefined;
    });
    return this.request;
  }

  private async fetchProducts(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      const rows: ProductRow[] = [];
      const pageSize = 1000;
      // Page through the API's row limit before publishing a complete catalog to the cart.
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await this.client
          .from('products')
          .select(
            'id, name, slug, category, flavor, description, price, image_url, inventory_quantity, is_available, is_featured, created_at, updated_at',
          )
          .eq('is_available', true)
          .order('id')
          .range(offset, offset + pageSize - 1)
          .returns<ProductRow[]>();
        if (error || !data) throw new Error('Catalog unavailable');
        rows.push(...data);
        if (data.length < pageSize) break;
      }
      const products = rows.filter((row) => row.is_available).map(mapProduct);
      this.productState.set(products);
      this.loadedState.set(true);
    } catch {
      // Preserve the last successful collection, and never reconcile saved carts against an error.
      this.errorState.set(
        'Our treats are taking a little longer to arrive. Please try loading the collection again.',
      );
    } finally {
      this.loadingState.set(false);
    }
  }

  byCategory(category: string) {
    return this.products().filter((product) => category === 'all' || product.category === category);
  }
  bySlug(slug: string) {
    return this.products().find((product) => product.slug === slug);
  }
  byId(id: string) {
    return this.products().find((product) => product.id === id);
  }
  categoryName(slug: string) {
    return this.categories.find((category) => category.slug === slug)?.name ?? slug;
  }
}
