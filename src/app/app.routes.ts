import { Routes } from '@angular/router';
export const routes: Routes = [
 { path: '', loadComponent: () => import('./features/home/home').then(m => m.Home) },
 { path: 'productos', title: 'Productos | MIQA', loadComponent: () => import('./features/products/products-coming-soon').then(m => m.ProductsComingSoon) },
 { path: 'proyectos', title: 'Proyectos | MIQA', loadComponent: () => import('./features/projects/projects-coming-soon').then(m => m.ProjectsComingSoon) }
];
