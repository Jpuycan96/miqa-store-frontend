import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminApi, adminError } from './admin-api';
@Component({selector:'app-admin-summary',imports:[RouterLink],styleUrl:'./admin.scss',template:`<p class="eyebrow">ADMINISTRACIÓN MIQA</p><h1>Tu catálogo</h1><p class="muted">Gestiona lo que tus clientes pueden descubrir.</p>@if(error()){<p class="feedback error" role="alert">{{error()}} <button (click)="load()">Reintentar</button></p>}@else if(!stats()){<p role="status">Cargando resumen…</p>}@else{<div class="stats">@for(stat of stats();track stat.label){<div><strong>{{stat.value}}</strong>{{stat.label}}</div>}</div>}<div class="actions"><a class="button primary" routerLink="/admin/productos/nuevo">Nuevo producto</a><a class="button" routerLink="/admin/productos">Gestionar productos</a></div>`,changeDetection:ChangeDetectionStrategy.OnPush})
export class AdminSummary {
 private readonly api=inject(AdminApi);readonly error=signal('');readonly stats=signal<{label:string;value:number}[]|null>(null);
 constructor(){this.load();}load(){this.error.set('');forkJoin({products:this.api.products(),categories:this.api.categories()}).subscribe({next:({products,categories})=>this.stats.set([{label:'Productos',value:products.length},{label:'Publicados',value:products.filter(p=>p.published).length},{label:'Destacados',value:products.filter(p=>p.featured).length},{label:'Categorías activas',value:categories.filter(c=>c.active).length}]),error:e=>this.error.set(adminError(e))});}
}
