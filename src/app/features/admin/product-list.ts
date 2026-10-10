import { sortProductsByName } from '../../shared/models/product-order';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, map, of, startWith, Subject, switchMap, merge, finalize, forkJoin } from 'rxjs';
import { AdminApi, adminError } from './admin-api';
import { AdminProduct } from './admin.models';
@Component({selector:'app-admin-products',imports:[ReactiveFormsModule,RouterLink,DatePipe],styleUrl:'./admin.scss',templateUrl:'./product-list.html',changeDetection:ChangeDetectionStrategy.OnPush})
export class AdminProductList {
 private readonly api=inject(AdminApi);private readonly refresh=new Subject<void>();
 readonly origin=signal<'ERP'|'LEGACY'>('ERP');readonly technical=signal<Record<string,{state:string;lastSyncedAt:string|null;error:string}>>({});
 readonly visibleProducts=computed(()=>this.state().products.filter(p=>(p.catalogMode==='ERP')===(this.origin()==='ERP')));
 readonly visibleCategories=computed(()=>this.categories().filter(c=>!!c.erpCategoryId===(this.origin()==='ERP')));
 readonly message=signal('');readonly actionError=signal('');readonly pending=signal<string|null>(null);
 readonly filters=new FormGroup({search:new FormControl('',{nonNullable:true}),category:new FormControl('',{nonNullable:true}),published:new FormControl('',{nonNullable:true}),featured:new FormControl('',{nonNullable:true})});
 readonly categories=toSignal(this.refresh.pipe(startWith(null),switchMap(()=>this.api.categories().pipe(catchError(e=>{this.actionError.set(adminError(e));return of([]);})))),{initialValue:[]});
 readonly state=toSignal(merge(this.filters.valueChanges.pipe(debounceTime(300)),this.refresh).pipe(startWith(null),switchMap(()=>this.api.products(this.filters.getRawValue()).pipe(switchMap(products=>{const erp=products.filter(p=>p.catalogMode==='ERP');return (erp.length?forkJoin(erp.map(p=>this.api.erpBinding(p.id).pipe(map(binding=>({id:p.id,state:binding.active?binding.state:'INACTIVE',lastSyncedAt:binding.lastSyncedAt??null,error:''})),catchError(e=>of({id:p.id,state:'No disponible',lastSyncedAt:null,error:adminError(e)}))))):of([])).pipe(map(bindings=>{this.technical.set(Object.fromEntries(bindings.map(b=>[b.id,{state:b.state,lastSyncedAt:b.lastSyncedAt,error:b.error}])));return {products:sortProductsByName(products),loading:false,error:''};}));}),startWith({products:[],loading:true,error:''}),catchError(e=>of({products:[],loading:false,error:adminError(e)}))))),{initialValue:{products:[],loading:true,error:''}});
 changeOrigin(value:'ERP'|'LEGACY'){this.origin.set(value);this.filters.controls.category.setValue('');}
 retry(){this.refresh.next();}
 toggle(p:AdminProduct,flag:'published'|'featured'){if(this.pending())return;this.pending.set(p.id);this.actionError.set('');this.api.flag(p.id,flag,!p[flag]).pipe(finalize(()=>this.pending.set(null))).subscribe({next:()=>{this.message.set('Producto actualizado.');this.retry();},error:e=>this.actionError.set(adminError(e))});}
}
