import { Routes } from '@angular/router';
export const routes: Routes = [
  {
    path: '',
    title: 'SweetCrumb | Little cakes. Big happiness.',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'shop',
    title: 'Shop the collection | SweetCrumb',
    loadComponent: () => import('./features/shop/shop.component').then((m) => m.ShopComponent),
  },
  {
    path: 'shop/:category',
    title: 'Our collections | SweetCrumb',
    loadComponent: () => import('./features/shop/shop.component').then((m) => m.ShopComponent),
  },
  {
    path: 'product/:slug',
    title: 'A little sweetness | SweetCrumb',
    loadComponent: () =>
      import('./features/product-detail/product-detail.component').then(
        (m) => m.ProductDetailComponent,
      ),
  },
  {
    path: 'cart',
    title: 'Your Order | SweetCrumb',
    loadComponent: () => import('./features/cart/cart.component').then((m) => m.CartComponent),
  },
  {
    path: '**',
    title: 'Page not found | SweetCrumb',
    loadComponent: () => import('./features/not-found.component').then((m) => m.NotFoundComponent),
  },
];
