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
 function flushList(){http.expectOne(base+'/categories').flush([category,legacy.category]);http.expectOne(base+'/products').flush([legacy,product]);http.expectOne(base+'/erp-catalog/bindings/'+product.id).flush({productId:product.id,erpServiceId:'22',active:true,state:'PENDING_REVALIDATION'});}
 it('defaults to ERP, shows technical state and separates historical entries',()=>{
  const f=list();expect(f.componentInstance.visibleProducts().map(p=>p.id)).toEqual([product.id]);expect(f.nativeElement.textContent).toContain('PENDING_REVALIDATION');expect(f.nativeElement.textContent).not.toContain('Nuevo producto');expect(f.componentInstance.visibleCategories()).toEqual([category]);f.componentInstance.origin.set('LEGACY');f.detectChanges();expect(f.componentInstance.visibleProducts().map(p=>p.id)).toEqual(['old']);expect(f.nativeElement.textContent).toContain('Historico');
 });
 it('synchronizes once, refreshes categories/products/bindings and never publishes automatically',()=>{
  const f=list();f.componentInstance.synchronize();f.componentInstance.synchronize();const request=http.expectOne(base+'/erp-catalog/sync');expect(request.request.method).toBe('POST');expect(f.componentInstance.syncing()).toBe(true);request.flush({outcome:'SUCCESS',received:1,changed:1,missing:0});flushList();expect(f.componentInstance.syncing()).toBe(false);expect(f.componentInstance.visibleProducts()[0].published).toBe(false);http.expectNone(req=>req.method==='PATCH');
 });
 it('recovers from sync failure without changing publication',()=>{
  const f=list();f.componentInstance.synchronize();http.expectOne(base+'/erp-catalog/sync').flush({outcome:'NOT_CONFIGURED'},{status:503,statusText:'Unavailable'});expect(f.componentInstance.actionError()).not.toBe('');expect(f.componentInstance.syncing()).toBe(false);expect(f.componentInstance.visibleProducts()[0].published).toBe(false);f.componentInstance.synchronize();http.expectOne(base+'/erp-catalog/sync').flush({outcome:'SUCCESS'});flushList();
 });
 it('publishes only by explicit action using the existing endpoint',()=>{
  const f=list();f.componentInstance.toggle(product,'published');const request=http.expectOne(base+'/products/'+product.id+'/published');expect(request.request.method).toBe('PATCH');expect(request.request.body).toEqual({published:true});request.flush({...product,published:true});flushList();
 });
 it('edits only editorial values and preserves identity and empty long description',()=>{
  const f=TestBed.createComponent(AdminProductForm);http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products/'+product.id).flush(product);f.detectChanges();const c=f.componentInstance;
  expect(c.form.valid).toBe(true);expect(c.form.controls.description.value).toBe('');expect(f.nativeElement.querySelector('[formControlName=categoryId]')).toBeNull();expect(f.nativeElement.querySelector('[formControlName=saleType]')).toBeNull();expect(f.nativeElement.querySelector('app-option-editor')).toBeNull();expect(f.nativeElement.querySelector('app-product-erp')).toBeNull();expect(f.nativeElement.querySelector('app-product-resources')).not.toBeNull();
  c.form.patchValue({name:'Titulo comercial',description:'Descripcion extensa',shortDescription:'Descripcion corta',displayOrder:8,featured:true,published:true,categoryId:'tampered',saleType:'AREA',unitLabel:'m2',minQuantity:5});c.save();const request=http.expectOne(base+'/products/'+product.id);expect(request.request.method).toBe('PUT');expect(request.request.body).toEqual({categoryId:category.id,name:'Titulo comercial',slug:product.slug,shortDescription:'Descripcion corta',description:'Descripcion extensa',displayOrder:8,featured:true,published:true,seoTitle:'SEO',seoDescription:'Resumen SEO',saleType:null,unitLabel:null,packSize:null,packLabel:null,minQuantity:null,quantityStep:null});request.flush({...product,name:'Titulo comercial'});
 });
 it('renders ERP categories read-only and blocks technical mutations',()=>{
  const f=TestBed.createComponent(AdminCategories);http.expectOne(base+'/categories').flush([category,legacy.category]);f.detectChanges();expect(f.componentInstance.visibleItems()).toEqual([category]);expect(f.nativeElement.textContent).not.toContain('Nueva categor');expect(f.nativeElement.querySelector('.compact-row button')).toBeNull();f.componentInstance.edit(category);f.componentInstance.toggle(category);f.componentInstance.remove(category);f.componentInstance.save();expect(f.componentInstance.editing()).toBe(false);http.expectNone(req=>req.method!=='GET');
 });
 it('counts ERP entries only on the existing dashboard',()=>{
  const f=TestBed.createComponent(AdminSummary);http.expectOne(base+'/categories').flush([category,legacy.category]);http.expectOne(base+'/products').flush([product,{...legacy,published:true,featured:true}]);f.detectChanges();expect(f.componentInstance.stats()?.map(s=>s.value)).toEqual([1,0,0,1]);expect(f.nativeElement.textContent).not.toContain('Nuevo producto');
 });
});
