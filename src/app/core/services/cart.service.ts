import { computed, effect, inject, Injectable, linkedSignal, signal } from '@angular/core';
import { CartItem, Product } from '../models/product';
import { ProductService } from './product.service';
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly catalog = inject(ProductService);
  private readonly storageKey = 'sweetcrumb-cart-v1';
  private readonly reviewingInventory = signal(false);
  private readonly reviewProducts = signal<readonly Product[]>([]);
  private readonly items = linkedSignal<
    { products: readonly Product[]; loaded: boolean; reviewing: boolean },
    readonly CartItem[]
  >({
    source: () => ({
      products: this.catalog.products(),
      loaded: this.catalog.loaded(),
      reviewing: this.reviewingInventory(),
    }),
    computation: ({ products, loaded, reviewing }, previous) => {
      const saved = previous?.value ?? this.restore();
      // Preserve saved IDs until a complete, successful catalog fetch is available.
      if (!loaded || reviewing) return saved;
      return saved.flatMap((item) => {
        const product = products.find((product) => product.id === item.productId);
        return product?.available && product.inventoryQuantity > 0
          ? [
              {
                productId: item.productId,
                quantity: Math.min(item.quantity, product.inventoryQuantity),
              },
            ]
          : [];
      });
    },
  });
  readonly announcement = signal('');
  readonly lines = computed(() =>
    this.items().flatMap((item) => {
      const product =
        this.catalog.byId(item.productId) ??
        (this.reviewingInventory()
          ? this.reviewProducts().find((product) => product.id === item.productId)
          : undefined);
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
  readonly needsInventoryReview = computed(() =>
    this.lines().some(
      (line) => !line.product.available || line.quantity > line.product.inventoryQuantity,
    ),
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
        if (items.length) localStorage.setItem(this.storageKey, JSON.stringify(items));
        else localStorage.removeItem(this.storageKey);
      } catch {
        /* The cart still works when storage is unavailable. */
      }
    });
  }
  clear() {
    this.items.set([]);
    this.reviewProducts.set([]);
    this.reviewingInventory.set(false);
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      /* In-memory cart is still cleared. */
    }
  }
  preserveForInventoryReview() {
    this.reviewProducts.set(
      this.lines().map((line) => ({ ...line.product, available: false, inventoryQuantity: 0 })),
    );
    this.reviewingInventory.set(true);
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
          !Number.isSafeInteger(item.quantity) ||
          item.quantity <= 0
        )
          continue;
        if (result.some((line) => line.productId === item.productId)) continue;
        result.push({ productId: item.productId, quantity: item.quantity });
      }
      return result;
    } catch {
      return [];
    }
  }
}
