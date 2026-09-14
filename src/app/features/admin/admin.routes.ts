import { Routes } from '@angular/router';
import { adminGuard } from './admin-auth';
export const adminRoutes:Routes=[
 {path:'login',loadComponent:()=>import('./login').then(m=>m.AdminLogin)},
 {path:'',canActivate:[adminGuard],canActivateChild:[adminGuard],loadComponent:()=>import('./layout').then(m=>m.AdminLayout),children:[
  {path:'',pathMatch:'full',loadComponent:()=>import('./summary').then(m=>m.AdminSummary)},
  {path:'productos',loadComponent:()=>import('./product-list').then(m=>m.AdminProductList)},
  {path:'productos/nuevo',loadComponent:()=>import('./product-form').then(m=>m.AdminProductForm)},
  {path:'productos/:id/editar',loadComponent:()=>import('./product-form').then(m=>m.AdminProductForm)},
  {path:'categorias',loadComponent:()=>import('./categories').then(m=>m.AdminCategories)}
 ]}
];
