import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', title: 'أوريل | عطور فاخرة', loadComponent: () => import('./features/home/home').then(m => m.Home) },
  { path: 'perfumes', title: 'العطور | أوريل', loadComponent: () => import('./features/perfumes/perfume-list/perfume-list').then(m => m.PerfumeList) },
  { path: 'perfumes/:slug', loadComponent: () => import('./features/perfumes/perfume-detail/perfume-detail').then(m => m.PerfumeDetail) },
  { path: 'cart', title: 'السلة | أوريل', loadComponent: () => import('./features/cart/cart').then(m => m.Cart) },
  { path: 'login', title: 'تسجيل الدخول | أوريل', loadComponent: () => import('./features/auth/login/login').then(m => m.Login) },
  { path: 'register', title: 'إنشاء حساب | أوريل', loadComponent: () => import('./features/auth/register/register').then(m => m.Register) },
  {
    path: 'account', title: 'حسابي | أوريل', canActivate: [authGuard],
    loadComponent: () => import('./features/account/account').then(m => m.Account),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'orders' },
      { path: 'orders', loadComponent: () => import('./features/account/orders/orders').then(m => m.Orders) },
      { path: 'favorites', loadComponent: () => import('./features/account/favorites/favorites').then(m => m.Favorites) }
    ]
  },
  { path: '**', redirectTo: '' }
];
