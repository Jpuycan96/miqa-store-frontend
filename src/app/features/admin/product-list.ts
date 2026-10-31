import { sortProductsByName } from '../../shared/models/product-order';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, map, of, startWith, Subject, switchMap, merge, finalize, forkJoin } from 'rxjs';
import { AdminApi, adminError } from './admin-api';
import { AdminProduct } from './admin.models';
import { ElementRef, viewChild } from '@angular/core';
import { AdminMaterialDrafts } from './material-drafts';
import type { MaterialDraft } from './erp-catalog.models';
@Component({selector:'app-admin-products',imports:[ReactiveFormsModule,RouterLink,DatePipe,AdminMaterialDrafts],styleUrl:'./admin.scss',templateUrl:'./product-list.html',changeDetection:ChangeDetectionStrategy.OnPush})
export class AdminProductList {
 private readonly api=inject(AdminApi);private readonly refresh=new Subject<void>();
 readonly technical=signal<Record<string,{state:string;lastSyncedAt:string|null;error:string;publicationScope?:'SERVICE'|'MATERIAL'}>>({});
 readonly visibleProducts=computed(()=>this.state().products.filter(p=>p.catalogMode==='ERP'));
 readonly visibleCategories=computed(()=>this.categories().filter(c=>!!c.erpCategoryId || this.visibleProducts().some(p=>p.categoryId===c.id)));
 readonly draftsOpen=signal(false);readonly createdDrafts=signal<MaterialDraft[]>([]);
 private readonly draftAction=viewChild<ElementRef<HTMLButtonElement>>('draftAction');
 readonly message=signal('');readonly actionError=signal('');readonly pending=signal<string|null>(null);
 readonly filters=new FormGroup({search:new FormControl('',{nonNullable:true}),category:new FormControl('',{nonNullable:true}),published:new FormControl('',{nonNullable:true}),featured:new FormControl('',{nonNullable:true})});
 readonly categories=toSignal(this.refresh.pipe(startWith(null),switchMap(()=>this.api.categories().pipe(catchError(e=>{this.actionError.set(adminError(e));return of([]);})))),{initialValue:[]});
 readonly state=toSignal(merge(this.filters.valueChanges.pipe(debounceTime(300)),this.refresh).pipe(startWith(null),switchMap(()=>this.api.products(this.filters.getRawValue()).pipe(switchMap(products=>{const erp=products.filter(p=>p.catalogMode==='ERP');return (erp.length?forkJoin(erp.map(p=>this.api.erpBinding(p.id).pipe(map(binding=>({id:p.id,state:binding.active?binding.state:'INACTIVE',lastSyncedAt:binding.lastSyncedAt??null,error:'',publicationScope:binding.publicationScope})),catchError(e=>of({id:p.id,state:'No disponible',lastSyncedAt:null,error:adminError(e),publicationScope:undefined}))))):of([])).pipe(map(bindings=>{this.technical.set(Object.fromEntries(bindings.map(b=>[b.id,{state:b.state,lastSyncedAt:b.lastSyncedAt,error:b.error,publicationScope:b.publicationScope}])));return {products:sortProductsByName(products),loading:false,error:''};}));}),startWith({products:[],loading:true,error:''}),catchError(e=>of({products:[],loading:false,error:adminError(e)}))))),{initialValue:{products:[],loading:true,error:''}});
 openDrafts(){this.draftsOpen.set(true);}
 closeDrafts(){this.draftsOpen.set(false);this.draftAction()?.nativeElement.focus();}
 draftsCreated(drafts:MaterialDraft[]){this.createdDrafts.set(drafts);this.message.set(drafts.length+' borradores creados. Puedes abrirlos para completar su contenido comercial.');this.closeDrafts();this.retry();}
 retry(){this.refresh.next();}
 canTogglePublished(p:AdminProduct){
  if(p.published)return true;
  const status=this.technical()[p.id];
  return status?.publicationScope!=='MATERIAL' || status.state==='AVAILABLE' && p.category.active;
 }
 toggle(p:AdminProduct,flag:'published'|'featured'){if(this.pending()||p.catalogMode!=='ERP'||flag==='published'&&!this.canTogglePublished(p))return;this.pending.set(p.id);this.actionError.set('');this.api.flag(p.id,flag,!p[flag]).pipe(finalize(()=>this.pending.set(null))).subscribe({next:()=>{this.message.set('Producto actualizado.');this.retry();},error:e=>this.actionError.set(adminError(e))});}
}
