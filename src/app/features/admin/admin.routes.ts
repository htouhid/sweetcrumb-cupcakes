import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { adminGuard } from '../../core/guards/admin.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard, adminGuard],
    canActivateChild: [authGuard, adminGuard],
    loadComponent: () => import('./admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        title: 'SweetCrumb Admin',
        loadComponent: () =>
          import('./admin-dashboard.component').then((m) => m.AdminDashboardComponent),
      },
      {
        path: 'orders',
        title: 'Bakery Orders | SweetCrumb',
        loadComponent: () => import('./admin-orders.component').then((m) => m.AdminOrdersComponent),
      },
      {
        path: 'orders/:id',
        title: 'Order Details | SweetCrumb',
        loadComponent: () =>
          import('./admin-order-detail.component').then((m) => m.AdminOrderDetailComponent),
      },
      {
        path: 'inventory',
        title: 'Inventory | SweetCrumb',
        loadComponent: () =>
          import('./admin-inventory.component').then((m) => m.AdminInventoryComponent),
      },
    ],
  },
];
