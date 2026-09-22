import { ProductRow } from '../models/product';
import { mapProduct } from '../models/product.mapper';

export function productRow(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: '1',
    name: 'Strawberry Dream',
    slug: 'strawberry-dream',
    category: 'Cupcakes',
    flavor: 'Strawberry',
    description: 'A strawberry cupcake.',
    price: 4.5,
    image_url: '/images/products/strawberry-dream.png',
    inventory_quantity: 18,
    is_available: true,
    is_featured: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}
// Test fixtures only; never imported by the storefront.
export const TEST_PRODUCTS = [
  mapProduct(productRow()),
  mapProduct(
    productRow({
      id: '2',
      slug: 'cookies-and-cream',
      name: 'Cookies & Cream',
      price: 4.75,
      inventory_quantity: 12,
    }),
  ),
  mapProduct(productRow({ id: '9', slug: 'sold-out', is_available: false, inventory_quantity: 0 })),
];
