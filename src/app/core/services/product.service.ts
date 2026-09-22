import { Injectable } from '@angular/core';
import { CATEGORIES, PRODUCTS } from '../data/products';
@Injectable({ providedIn: 'root' })
export class ProductService {
  readonly products = PRODUCTS;
  readonly categories = CATEGORIES;
  readonly featured = PRODUCTS.filter((product) => product.featured);
  bySlug(slug: string) {
    return this.products.find((product) => product.slug === slug);
  }
  byId(id: string) {
    return this.products.find((product) => product.id === id);
  }
  categoryName(slug: string) {
    return this.categories.find((category) => category.slug === slug)?.name ?? slug;
  }
}
