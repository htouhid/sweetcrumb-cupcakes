export type ProductCategory = 'cupcakes' | 'vegan-cupcakes' | 'mini-cupcakes' | 'cakes';
export interface Product {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly category: ProductCategory;
  readonly flavor: string;
  readonly description: string;
  readonly price: number;
  readonly image: string;
  readonly inventoryQuantity: number;
  readonly featured: boolean;
  readonly available: boolean;
}
export interface CartItem {
  readonly productId: string;
  readonly quantity: number;
}
