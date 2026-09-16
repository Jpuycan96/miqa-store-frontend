import { Routes } from '@angular/router';
export const routes: Routes = [
 { path: 'admin', loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes) },
 { path: '', loadComponent: () => import('./features/home/home').then(m => m.Home) },
 { path: 'productos', loadComponent: () => import('./features/products/product-shell').then(m => m.ProductShell), children: [
   { path: '', pathMatch: 'full', title: 'Productos | MIQA', loadComponent: () => import('./features/products/catalog/catalog').then(m => m.Catalog) },
   { path: ':slug', loadComponent: () => import('./features/products/detail/product-detail').then(m => m.ProductDetail) }
 ] },
 { path: 'proyectos', title: 'Proyectos | MIQA', loadComponent: () => import('./features/projects/projects-coming-soon').then(m => m.ProjectsComingSoon) },
 { path: '**', loadComponent: () => import('./features/not-found/not-found').then(m => m.NotFound) }
];
