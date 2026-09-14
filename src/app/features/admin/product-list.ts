import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, map, of, startWith, Subject, switchMap, merge, finalize } from 'rxjs';
import { AdminApi, adminError } from './admin-api';
import { AdminProduct } from './admin.models';
@Component({selector:'app-admin-products',imports:[ReactiveFormsModule,RouterLink],styleUrl:'./admin.scss',templateUrl:'./product-list.html',changeDetection:ChangeDetectionStrategy.OnPush})
export class AdminProductList {
 private readonly api=inject(AdminApi);private readonly refresh=new Subject<void>();
 readonly message=signal('');readonly actionError=signal('');readonly pending=signal<string|null>(null);
 readonly filters=new FormGroup({search:new FormControl('',{nonNullable:true}),category:new FormControl('',{nonNullable:true}),published:new FormControl('',{nonNullable:true}),featured:new FormControl('',{nonNullable:true})});
 readonly categories=toSignal(this.api.categories().pipe(catchError(e=>{this.actionError.set(adminError(e));return of([]);})),{initialValue:[]});
 readonly state=toSignal(merge(this.filters.valueChanges.pipe(debounceTime(300)),this.refresh).pipe(startWith(null),switchMap(()=>this.api.products(this.filters.getRawValue()).pipe(map(products=>({products,loading:false,error:''})),startWith({products:[],loading:true,error:''}),catchError(e=>of({products:[],loading:false,error:adminError(e)}))))),{initialValue:{products:[],loading:true,error:''}});
 retry(){this.refresh.next();}
 toggle(p:AdminProduct,flag:'published'|'featured'){if(this.pending())return;this.pending.set(p.id);this.actionError.set('');this.api.flag(p.id,flag,!p[flag]).pipe(finalize(()=>this.pending.set(null))).subscribe({next:()=>{this.message.set('Producto actualizado.');this.retry();},error:e=>this.actionError.set(adminError(e))});}
}
