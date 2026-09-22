export type ProductCategory = 'cupcakes' | 'vegan-cupcakes' | 'mini-cupcakes' | 'cakes';
export interface Product {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly category: string;
  readonly flavor: string;
  readonly description: string;
  readonly price: number;
  readonly image: string;
  readonly inventoryQuantity: number;
  readonly featured: boolean;
  readonly available: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface CartItem {
  readonly productId: string;
  readonly quantity: number;
}

/** The public.products row shape; conversion is confined to the data-access layer. */
export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  category: string;
  flavor: string | null;
  description: string | null;
  price: number | string;
  image_url: string | null;
  inventory_quantity: number;
  is_available: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}
