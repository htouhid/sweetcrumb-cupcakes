import { ProductCategory } from '../models/product';
export const CATEGORIES: ReadonlyArray<{
  slug: ProductCategory;
  name: string;
  description: string;
  image: string;
}> = [
  {
    slug: 'cupcakes',
    name: 'Cupcakes',
    description: 'A little joy in every swirl.',
    image: '/images/categories/cupcakes.jpg',
  },
  {
    slug: 'vegan-cupcakes',
    name: 'Vegan Cupcakes',
    description: 'Plant-based. Full of pleasure.',
    image: '/images/categories/vegan-cupcakes.jpeg',
  },
  {
    slug: 'mini-cupcakes',
    name: 'Mini Cupcakes',
    description: 'Tiny treats. Big smiles.',
    image: '/images/categories/mini-cupcakes.jpg',
  },
  {
    slug: 'cakes',
    name: 'Cakes',
    description: 'For moments worth celebrating.',
    image: '/images/categories/cakes.svg',
  },
];
