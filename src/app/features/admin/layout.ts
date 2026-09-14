import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuth } from './admin-auth';
import { Seo } from '../../core/seo/seo';
@Component({selector:'app-admin-layout',imports:[RouterLink,RouterLinkActive,RouterOutlet],styleUrls:['./admin.scss','./layout.scss'],template:
`<header class="mobile-bar"><strong>MIQA / Admin</strong><button (click)="menu.set(!menu())" [attr.aria-expanded]="menu()" aria-controls="admin-nav">{{menu()?'Cerrar menú':'Menú'}}</button></header>
<div class="admin-shell"><aside [class.open]="menu()"><a class="brand" routerLink="/admin" (click)="menu.set(false)">MIQA<span>Administración</span></a><nav id="admin-nav" aria-label="Administración"><a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" (click)="menu.set(false)">Resumen</a><a routerLink="/admin/productos" routerLinkActive="active" (click)="menu.set(false)">Productos</a><a routerLink="/admin/categorias" routerLinkActive="active" (click)="menu.set(false)">Categorías</a></nav><div class="sidebar-bottom"><a routerLink="/productos">Ver catálogo ↗</a><button (click)="logout()">Cerrar sesión</button></div></aside><main><router-outlet /></main></div>`,changeDetection:ChangeDetectionStrategy.OnPush})
export class AdminLayout {
 readonly menu=signal(false);private readonly auth=inject(AdminAuth);private readonly router=inject(Router);
 constructor(){inject(Seo).applyPage('/admin',{title:'Administración | MIQA',description:'Gestión del catálogo MIQA.',robots:'noindex,nofollow'});}
 logout(){this.auth.logout();void this.router.navigateByUrl('/admin/login');}
}
