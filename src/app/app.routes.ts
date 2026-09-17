import { inject } from '@angular/core';
import { CanMatchFn, Routes } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ProductCatalog } from './core/data/product-catalog';

export const categoryCanMatch: CanMatchFn = (_route, segments) => {
  const slug = segments[0]?.path ?? '';
  return inject(ProductCatalog).categories().pipe(
    map(categories => categories.some(category => category.slug === slug)),
    catchError(() => of(false))
  );
};

export const routes: Routes = [
 { path: 'admin', loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes) },
 { path: '', loadComponent: () => import('./features/home/home').then(m => m.Home) },
 { path: 'productos', loadComponent: () => import('./features/products/product-shell').then(m => m.ProductShell), children: [
   { path: '', pathMatch: 'full', title: 'Productos | MIQA', loadComponent: () => import('./features/products/catalog/catalog').then(m => m.Catalog) },
   { path: ':slug', canMatch: [categoryCanMatch], data: { categoryRoute: true }, loadComponent: () => import('./features/products/catalog/catalog').then(m => m.Catalog) },
   { path: ':slug', loadComponent: () => import('./features/products/detail/product-detail').then(m => m.ProductDetail) }
 ] },
 { path: 'proyectos', title: 'Proyectos | MIQA', loadComponent: () => import('./features/projects/projects-coming-soon').then(m => m.ProjectsComingSoon) },
 { path: '**', loadComponent: () => import('./features/not-found/not-found').then(m => m.NotFound) }
];
