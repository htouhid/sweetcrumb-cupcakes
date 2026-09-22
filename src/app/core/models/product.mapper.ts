import { Product, ProductRow } from './product';

export function mapProduct(row: ProductRow): Product {
  const price = Number(row.price);
  if (
    row.price === null ||
    row.price === '' ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isSafeInteger(row.inventory_quantity) ||
    row.inventory_quantity < 0
  ) {
    throw new Error('Invalid product pricing or inventory');
  }
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-'),
    flavor: row.flavor ?? '',
    description: row.description ?? '',
    price,
    image: row.image_url?.startsWith('/images/')
      ? row.image_url
      : '/images/products/placeholder.svg',
    inventoryQuantity: row.inventory_quantity,
    available: row.is_available,
    featured: row.is_featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
