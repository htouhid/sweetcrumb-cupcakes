import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { CartItem, Product } from '../models/product';
import { ProductService } from './product.service';
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly catalog = inject(ProductService);
  private readonly storageKey = 'sweetcrumb-cart-v1';
  private readonly items = signal<readonly CartItem[]>(this.restore());
  readonly announcement = signal('');
  readonly lines = computed(() =>
    this.items().flatMap((item) => {
      const product = this.catalog.byId(item.productId);
      return product
        ? [
            {
              product,
              quantity: item.quantity,
              total: (Math.round(product.price * 100) * item.quantity) / 100,
            },
          ]
        : [];
    }),
  );
  readonly totalQuantity = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0),
  );
  readonly subtotal = computed(
    () => this.lines().reduce((sum, line) => sum + Math.round(line.total * 100), 0) / 100,
  );
  constructor() {
    effect(() => {
      const items = this.items();
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(items));
      } catch {
        /* The cart still works when storage is unavailable. */
      }
    });
  }
  quantityFor(id: string) {
    return this.items().find((item) => item.productId === id)?.quantity ?? 0;
  }
  remaining(product: Product) {
    return product.available
      ? Math.max(0, product.inventoryQuantity - this.quantityFor(product.id))
      : 0;
  }
  addItem(product: Product, quantity = 1) {
    const current = this.catalog.byId(product.id);
    if (!current || !Number.isInteger(quantity) || quantity < 1) return;
    const added = Math.min(quantity, this.remaining(current));
    if (!added) return;
    this.setQuantity(current.id, this.quantityFor(current.id) + added);
    this.announcement.set(
      `${added} ${current.name} added. Your order has ${this.totalQuantity()} items.`,
    );
  }
  removeItem(id: string) {
    this.items.update((items) => items.filter((item) => item.productId !== id));
  }
  setQuantity(id: string, quantity: number) {
    const product = this.catalog.byId(id);
    if (!product || !Number.isFinite(quantity)) return;
    const safe = product.available
      ? Math.max(0, Math.min(Math.floor(quantity), product.inventoryQuantity))
      : 0;
    if (!safe) {
      this.removeItem(id);
      return;
    }
    this.items.update((items) =>
      items.some((item) => item.productId === id)
        ? items.map((item) => (item.productId === id ? { ...item, quantity: safe } : item))
        : [...items, { productId: id, quantity: safe }],
    );
  }
  private restore(): readonly CartItem[] {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(this.storageKey) ?? '[]');
      if (!Array.isArray(stored)) return [];
      const result: CartItem[] = [];
      for (const item of stored) {
        if (
          !item ||
          typeof item.productId !== 'string' ||
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0
        )
          continue;
        const product = this.catalog.byId(item.productId);
        if (
          !product?.available ||
          product.inventoryQuantity <= 0 ||
          result.some((line) => line.productId === product.id)
        )
          continue;
        result.push({
          productId: product.id,
          quantity: Math.min(item.quantity, product.inventoryQuantity),
        });
      }
      return result;
    } catch {
      return [];
    }
  }
}
