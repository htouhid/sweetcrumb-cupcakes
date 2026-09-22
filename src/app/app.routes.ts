import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
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
    path: 'sign-up',
    title: 'Create Account | SweetCrumb',
    loadComponent: () => import('./features/auth/sign-up.component').then((m) => m.SignUpComponent),
  },
  {
    path: 'sign-in',
    title: 'Sign In | SweetCrumb',
    loadComponent: () => import('./features/auth/sign-in.component').then((m) => m.SignInComponent),
  },
  {
    path: 'account',
    title: 'My Account | SweetCrumb',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/account.component').then((m) => m.AccountComponent),
  },
  {
    path: '**',
    title: 'Page not found | SweetCrumb',
    loadComponent: () => import('./features/not-found.component').then((m) => m.NotFoundComponent),
  },
];
