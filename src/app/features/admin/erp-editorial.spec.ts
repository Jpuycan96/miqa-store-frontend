import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { STORE_API_CONFIG } from '../../core/config/store-api';
import { AdminProductList } from './product-list';
import { AdminProductForm } from './product-form';
import { AdminCategories } from './categories';
import { AdminSummary } from './summary';
import { AdminCategory, AdminProduct } from './admin.models';

const category:AdminCategory={id:'c-erp',erpCategoryId:'7',name:'Impresiones',slug:'impresiones',description:null,catalogHeadline:null,catalogDescription:null,active:true,displayOrder:0};
const product:AdminProduct={id:'p-erp',catalogMode:'ERP',categoryId:category.id,category,name:'Banner editorial',slug:'banner-editorial',shortDescription:'Breve',description:'',saleType:null,unitLabel:null,packSize:null,packLabel:null,minQuantity:null,quantityStep:null,published:false,featured:false,displayOrder:4,seoTitle:'SEO',seoDescription:'Resumen SEO',image:'',materials:[],extras:[],images:[]};
const legacy={...product,id:'old',catalogMode:'LEGACY' as const,name:'Historico',category:{...category,id:'old-category',erpCategoryId:null}};
describe('V10 editorial admin',()=>{
 let http:HttpTestingController;let base:string;
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),{provide:ActivatedRoute,useValue:{snapshot:{paramMap:convertToParamMap({id:product.id})}}}]});http=TestBed.inject(HttpTestingController);base=TestBed.inject(STORE_API_CONFIG).baseUrl+'/api/admin';});
 afterEach(()=>http.verify());
 function list(){const f=TestBed.createComponent(AdminProductList);flushList();f.detectChanges();return f;}
 function flushList(current = product){http.expectOne(base+'/categories').flush([category,legacy.category]);http.expectOne(base+'/products').flush([legacy,current]);http.expectOne(base+'/erp-catalog/bindings/'+product.id).flush({productId:product.id,erpServiceId:'22',active:true,state:'PENDING_REVALIDATION',lastSyncedAt:'2026-10-09T12:34:00Z'});}
 it('defaults to ERP and keeps technical state internal',()=>{
  const f=list();expect(f.componentInstance.visibleProducts().map(p=>p.id)).toEqual([product.id]);expect(f.nativeElement.textContent).not.toContain('PENDING_REVALIDATION');expect(f.nativeElement.textContent).not.toContain('Nuevo producto');expect(f.componentInstance.visibleCategories()).toEqual([category]);expect(f.nativeElement.textContent).not.toContain('Historico');expect(f.nativeElement.textContent).not.toContain('Legacy');

 });
 it('keeps ERP state and last synchronization internally without polling',async()=>{
  vi.useFakeTimers();
  try {
   const f=list();const text=f.nativeElement.textContent;
   expect(text).not.toContain('Sincronizar con ERP');expect(text).not.toContain('Sincronizando');
   expect(text).not.toContain('PENDING_REVALIDATION');expect(text).not.toContain('Última sincronización');
   expect(f.componentInstance.technical()[product.id].lastSyncedAt).toBe('2026-10-09T12:34:00Z');
   expect(f.nativeElement.querySelector('a[href="/admin/productos/p-erp/editar"]')).not.toBeNull();
   expect(f.componentInstance.visibleProducts()[0].published).toBe(false);
   await vi.advanceTimersByTimeAsync(60000);
   http.expectNone(()=>true);
  } finally {vi.useRealTimers();}
 });
 it('keeps an inactive binding without a synchronization date internally',()=>{
  const f=TestBed.createComponent(AdminProductList);http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products').flush([product]);http.expectOne(base+'/erp-catalog/bindings/'+product.id).flush({active:false,state:'AVAILABLE',lastSyncedAt:null});f.detectChanges();
  expect(f.nativeElement.textContent).not.toContain('INACTIVE');expect(f.componentInstance.technical()[product.id].state).toBe('INACTIVE');expect(f.nativeElement.querySelector('time')).toBeNull();http.expectNone(req=>req.method!=='GET');
 });
 it('preserves products and exposes safe binding errors without invoking synchronization',()=>{
  const f=TestBed.createComponent(AdminProductList);http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products').flush([product]);http.expectOne(base+'/erp-catalog/bindings/'+product.id).flush({}, {status:503,statusText:'Unavailable'});f.detectChanges();
  expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain('No pudimos completar');expect(f.componentInstance.visibleProducts()[0].published).toBe(false);
  f.componentInstance.retry();flushList();f.detectChanges();expect(f.nativeElement.querySelector('[role=alert]')).toBeNull();expect(f.nativeElement.textContent).not.toContain('PENDING_REVALIDATION');http.expectNone(req=>req.method!=='GET');
 });
 it('keeps load errors and retry as read-only requests',()=>{
  const f=TestBed.createComponent(AdminProductList);http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products').flush({}, {status:503,statusText:'Unavailable'});f.detectChanges();
  expect(f.nativeElement.querySelector('[role=alert]')).not.toBeNull();
  (f.nativeElement.querySelector('[role=alert] button') as HTMLButtonElement).click();flushList();f.detectChanges();expect(f.componentInstance.visibleProducts()).toEqual([product]);http.expectNone(req=>req.method!=='GET');
 });
 it('shows confirmed switch and row state, and retains them on publication or hiding errors',()=>{
  const f=list();
  const control=()=>f.nativeElement.querySelector('[role=switch]') as HTMLButtonElement;
  const row=()=>f.nativeElement.querySelector('.product-list .row') as HTMLElement;
  const publication=base+'/products/'+product.id+'/published';
  expect(control().getAttribute('aria-label')).toBe('Publicar producto');
  expect(control().getAttribute('aria-checked')).toBe('false');
  expect(row().classList.contains('unpublished')).toBe(true);
  expect(row().querySelector('a[title="Editar producto"]')?.textContent?.trim()).toBe('');
  expect(row().querySelector('.trash')).toBeNull();

  control().click();
  f.detectChanges();
  expect(control().disabled).toBe(true);
  expect(control().getAttribute('aria-checked')).toBe('false');
  control().click();
  const failed=http.expectOne(publication);
  expect(failed.request.method).toBe('PATCH');
  expect(failed.request.body).toEqual({published:true});
  failed.flush({}, {status:409,statusText:'Conflict'});
  f.detectChanges();
  expect(control().disabled).toBe(false);
  expect(control().getAttribute('aria-checked')).toBe('false');
  expect(row().classList.contains('unpublished')).toBe(true);

  control().click();
  const published={...product,published:true};
  http.expectOne(publication).flush(published);
  flushList(published);
  f.detectChanges();
  expect(control().getAttribute('aria-label')).toBe('Ocultar producto');
  expect(control().getAttribute('aria-checked')).toBe('true');
  expect(row().classList.contains('unpublished')).toBe(false);

  const confirm=vi.spyOn(window,'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  try {
   control().click();
   http.expectNone(publication);
   control().click();
   f.detectChanges();
   expect(control().getAttribute('aria-checked')).toBe('true');
   const hide=http.expectOne(publication);
   expect(hide.request.body).toEqual({published:false});
   hide.flush({}, {status:503,statusText:'Unavailable'});
   f.detectChanges();
   expect(control().getAttribute('aria-checked')).toBe('true');
   expect(row().classList.contains('unpublished')).toBe(false);
  } finally {confirm.mockRestore();}
  const favorite=row().querySelector('.star') as HTMLButtonElement;
  favorite.click();
  const feature=http.expectOne(base+'/products/'+product.id+'/featured');
  expect(feature.request.body).toEqual({featured:true});
  feature.flush({...published,featured:true});
  flushList({...published,featured:true});
  f.detectChanges();
  expect(row().querySelector('.star')?.getAttribute('aria-pressed')).toBe('true');
 });
 it('keeps ERP search and filters and rejects local legacy toggles',async()=>{
  vi.useFakeTimers();
  try {
   const f=list();f.componentInstance.toggle(legacy,'featured');http.expectNone(req=>req.method!=='GET');
   f.componentInstance.filters.patchValue({search:'Banner',category:category.id,published:'false',featured:'true'});
   await vi.advanceTimersByTimeAsync(350);
   const request=http.expectOne(req=>req.url===base+'/products');
   expect(request.request.params.get('search')).toBe('Banner');expect(request.request.params.get('category')).toBe(category.id);
   expect(request.request.params.get('published')).toBe('false');expect(request.request.params.get('featured')).toBe('true');
   request.flush([]);f.detectChanges();expect(f.componentInstance.visibleProducts()).toEqual([]);
  } finally {vi.useRealTimers();}
 });
 it('filters the list using the searchable category control',async()=>{
  vi.useFakeTimers();
  try {
   const f=list();
   const field=f.nativeElement.querySelector('#product-filter-category') as HTMLInputElement;
   expect(field.value).toBe('Todas');
   field.click();
   f.detectChanges();
   expect(field.value).toBe('');
   expect(field.placeholder).toBe('Buscar categoría');
   expect(f.nativeElement.querySelector('#product-filter-category-options [role=option]')?.textContent?.trim()).toBe('Todas');
   field.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
   f.detectChanges();
   expect(field.value).toBe('Todas');
   field.value='IMPRESIONES';
   field.dispatchEvent(new Event('input',{bubbles:true}));
   f.detectChanges();
   const option=f.nativeElement.querySelector('#product-filter-category-options [role=option]') as HTMLElement;
   expect(option.textContent?.trim()).toBe(category.name);
   option.click();
   await vi.advanceTimersByTimeAsync(350);
   const request=http.expectOne(req=>req.url===base+'/products');
   expect(request.request.params.get('category')).toBe(category.id);
   request.flush([]);
   f.detectChanges();
   expect(field.value).toBe(category.name);
  } finally {vi.useRealTimers();}
 });
 it('edits only editorial values and preserves identity and empty long description',()=>{
  const f=TestBed.createComponent(AdminProductForm);http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products/'+product.id).flush(product);http.expectOne(base+'/erp-catalog/bindings/'+product.id).flush({publicationScope:'SERVICE'});f.detectChanges();const c=f.componentInstance;
  expect(c.form.valid).toBe(true);expect(c.form.controls.description.value).toBe('');expect(f.nativeElement.querySelector('[formControlName=categoryId]')).toBeNull();expect(f.nativeElement.querySelector('[formControlName=saleType]')).toBeNull();expect(f.nativeElement.querySelector('app-option-editor')).toBeNull();expect(f.nativeElement.querySelector('app-product-erp')).toBeNull();expect(f.nativeElement.querySelector('app-product-resources')).not.toBeNull();
  expect(f.nativeElement.querySelector('[formControlName=shortDescription]')).toBeNull();
  for(const field of ['description','seoTitle','seoDescription']) expect(f.nativeElement.querySelector('[formControlName='+field+']')).not.toBeNull();
  c.form.patchValue({name:'Titulo comercial',description:'Descripcion extensa',seoTitle:'Nuevo SEO',seoDescription:'Nueva descripcion SEO',displayOrder:8,featured:true,categoryId:'tampered',saleType:'AREA',unitLabel:'m2',minQuantity:5});c.save();const request=http.expectOne(base+'/products/'+product.id);expect(request.request.method).toBe('PUT');expect(request.request.body).toEqual({categoryId:category.id,name:'Titulo comercial',slug:product.slug,shortDescription:product.shortDescription,description:'Descripcion extensa',displayOrder:8,featured:true,published:false,seoTitle:'Nuevo SEO',seoDescription:'Nueva descripcion SEO',saleType:null,unitLabel:null,packSize:null,packLabel:null,minQuantity:null,quantityStep:null});request.flush({...product,name:'Titulo comercial'});
 });
 it('keeps material editing and explicit publication available without publishing on load',()=>{
  const commercial={...category,id:'commercial',erpCategoryId:null,name:'Comercial'};
  const material={...product,categoryId:commercial.id,category:commercial};
  const f=TestBed.createComponent(AdminProductForm);
  http.expectOne(base+'/categories').flush([category,commercial,{...commercial,id:'inactive',active:false}]);
  http.expectOne(base+'/products/'+product.id).flush(material);
  http.expectOne(base+'/erp-catalog/bindings/'+product.id).flush({publicationScope:'MATERIAL'});
  f.detectChanges();const c=f.componentInstance;
  expect(f.nativeElement.querySelector('[formControlName=published]')).toBeNull();
  expect(f.nativeElement.textContent).toContain('Se validarán al publicar');
  expect(c.form.controls.categoryId.enabled).toBe(true);
  expect(c.categories().map(item=>item.id)).toEqual([category.id,commercial.id]);
  expect(f.nativeElement.querySelector('app-product-resources')).not.toBeNull();
  for(const key of ['name','description','seoTitle','seoDescription'])expect(c.form.controls[key as 'name'].enabled).toBe(true);
  c.form.patchValue({name:'Vinil comercial',description:'Descripción',seoTitle:'SEO nuevo',categoryId:category.id});
  c.save();const req=http.expectOne(base+'/products/'+product.id);
  expect(req.request.body.published).toBe(false);expect(req.request.body.categoryId).toBe(category.id);
  expect(req.request.body.slug).toBe(product.slug);req.flush({...material,name:'Vinil comercial'});
 });
 it('does not expose an editor or permit saving if binding lookup fails',()=>{
  const f=TestBed.createComponent(AdminProductForm);
  http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products/'+product.id).flush(product);
  http.expectOne(base+'/erp-catalog/bindings/'+product.id).flush({}, {status:503,statusText:'Unavailable'});
  f.detectChanges();expect(f.nativeElement.querySelector('form')).toBeNull();
  f.componentInstance.save();http.expectNone(req=>req.method!=='GET');
 });
 it('lists only ERP categories and edits editorial fields without structural actions',()=>{
  const f=TestBed.createComponent(AdminCategories);http.expectOne(base+'/categories').flush([category,legacy.category]);f.detectChanges();expect(f.componentInstance.visibleItems()).toEqual([category]);expect(f.nativeElement.textContent).not.toContain('Legacy');expect(f.nativeElement.querySelectorAll('.compact-row button').length).toBe(1);
  f.componentInstance.edit(category);f.detectChanges();for(const field of ['name','slug','erpCategoryId']) expect(f.nativeElement.querySelector('[formControlName='+field+']')).toBeNull();
  f.componentInstance.form.patchValue({description:'Editorial',catalogHeadline:'Cabecera',catalogDescription:'Resumen',displayOrder:6,active:false,name:'tampered'});f.componentInstance.save();const req=http.expectOne(base+'/categories/'+category.id);expect(req.request.method).toBe('PUT');expect(req.request.body).toEqual({name:category.name,description:'Editorial',catalogHeadline:'Cabecera',catalogDescription:'Resumen',displayOrder:6,active:false});req.flush(category);http.expectOne(base+'/categories').flush([category]);
 });
 it('counts ERP entries only on the existing dashboard',()=>{
  const f=TestBed.createComponent(AdminSummary);http.expectOne(base+'/categories').flush([category,legacy.category]);http.expectOne(base+'/products').flush([product,{...legacy,published:true,featured:true}]);f.detectChanges();expect(f.componentInstance.stats()?.map(s=>s.value)).toEqual([1,0,0,1]);expect(f.nativeElement.textContent).not.toContain('Nuevo producto');
 });
 it('shows a stale publication conflict and retains unsaved editorial values',()=>{
  const f=TestBed.createComponent(AdminProductForm);
  http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products/'+product.id).flush(product);
  http.expectOne(base+'/erp-catalog/bindings/'+product.id).flush({publicationScope:'MATERIAL'});f.detectChanges();
  expect(f.componentInstance.product()?.published).toBe(false);
  http.expectNone(req=>req.method!=='GET');
  f.componentInstance.form.controls.name.setValue('Nombre sin guardar');f.componentInstance.save();
  http.expectOne(base+'/products/'+product.id).flush({message:'Material ERP retirado'}, {status:409,statusText:'Conflict'});f.detectChanges();
  expect(f.nativeElement.querySelector('[role=alert]')?.textContent).toContain('Material ERP retirado');
  expect(f.componentInstance.busy()).toBe(false);
  expect(f.componentInstance.form.controls.name.value).toBe('Nombre sin guardar');
 });
 it('allows MATERIAL publishing explicitly, prevents double send and reports backend errors',()=>{
  const f=TestBed.createComponent(AdminProductList);
  http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products').flush([product]);
  http.expectOne(base+'/erp-catalog/bindings/'+product.id).flush({active:true,state:'AVAILABLE',publicationScope:'MATERIAL'});f.detectChanges();
  expect(f.componentInstance.canTogglePublished(product)).toBe(true);
  http.expectNone(req=>req.method!=='GET');
  f.componentInstance.toggle(product,'published');f.componentInstance.toggle(product,'published');
  const req=http.expectOne(base+'/products/'+product.id+'/published');expect(req.request.body).toEqual({published:true});
  req.flush({message:'Modelo ERP retirado'}, {status:409,statusText:'Conflict'});f.detectChanges();
  expect(f.nativeElement.querySelector('[role=alert]')?.textContent).toContain('Modelo ERP retirado');
  expect(f.componentInstance.pending()).toBeNull();
 });
 it('sends the original publication value when saving editorial fields',()=>{
  const f=TestBed.createComponent(AdminProductForm);
  http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products/'+product.id).flush({...product,published:true});
  http.expectOne(base+'/erp-catalog/bindings/'+product.id).flush({active:false,state:'UNAVAILABLE',publicationScope:'MATERIAL'});f.detectChanges();
  expect(f.nativeElement.querySelector('[formControlName=published]')).toBeNull();
  f.componentInstance.save();
  const req=http.expectOne(base+'/products/'+product.id);expect(req.request.body.published).toBe(true);req.flush({...product,published:true});
 });
 it('blocks known unavailable MATERIAL publication but never blocks unpublishing',()=>{
  const f=TestBed.createComponent(AdminProductList);
  http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products').flush([product]);
  http.expectOne(base+'/erp-catalog/bindings/'+product.id).flush({active:false,state:'UNAVAILABLE',publicationScope:'MATERIAL'});f.detectChanges();
  expect(f.componentInstance.canTogglePublished(product)).toBe(false);
  f.componentInstance.toggle(product,'published');http.expectNone(req=>req.method!=='GET');
  const published={...product,published:true};expect(f.componentInstance.canTogglePublished(published)).toBe(true);
  const confirm=vi.spyOn(window,'confirm').mockReturnValue(true);
  try { f.componentInstance.toggle(published,'published'); }
  finally { confirm.mockRestore(); }
  const req=http.expectOne(base+'/products/'+product.id+'/published');expect(req.request.body).toEqual({published:false});
  req.flush(product);flushList();
 });
});
