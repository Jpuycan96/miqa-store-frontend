import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { AdminProductForm } from './product-form';
import { AdminProductList } from './product-list';
import { AdminCategories } from './categories';
import { AdminProduct } from './admin.models';
import { environment } from '../../../environments/environment';
const base=`${environment.storeApiBaseUrl}/api/admin`;
const category={id:'c1',name:'Categoría',slug:'categoria',description:'',catalogHeadline:'Haz visible tu marca.',catalogDescription:'Descripción comercial.',active:true,displayOrder:0};
const product:AdminProduct={id:'p1',categoryId:'c1',category,name:'Producto',slug:'producto',shortDescription:'',description:'',saleType:'QUANTITY',unitLabel:'unidad',packSize:null,packLabel:null,minQuantity:1,quantityStep:1,published:false,featured:false,displayOrder:0,seoTitle:'',seoDescription:'',image:'',materials:[],extras:[],images:[]};
describe('Admin catalog forms',()=>{
 let http:HttpTestingController;
 let route={snapshot:{paramMap:convertToParamMap({})}};
 beforeEach(()=>{route={snapshot:{paramMap:convertToParamMap({})}};TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),{provide:ActivatedRoute,useValue:route}]});http=TestBed.inject(HttpTestingController);});
 afterEach(()=>http.verify());
 it('redirects legacy edits without exposing a form or sending mutations',()=>{
  route.snapshot.paramMap=convertToParamMap({id:'p1'});const nav=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
  const f=TestBed.createComponent(AdminProductForm);http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products/p1').flush(product);f.detectChanges();
  expect(nav).toHaveBeenCalledWith(['/admin/productos'],{replaceUrl:true});expect(f.nativeElement.querySelector('form')).toBeNull();f.componentInstance.save();http.expectNone(req=>req.method!=='GET');
 });
 it('redirects a missing product identity without creating a product',()=>{
  const nav=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);const f=TestBed.createComponent(AdminProductForm);f.componentInstance.save();
  expect(nav).toHaveBeenCalledWith(['/admin/productos'],{replaceUrl:true});http.expectNone(()=>true);
 });
 it('does not create or edit legacy categories',()=>{
  const f=TestBed.createComponent(AdminCategories);http.expectOne(base+'/categories').flush([category]);const c=f.componentInstance;c.edit();expect(c.editing()).toBe(false);c.save();http.expectNone(base+'/categories');c.edit(category);expect(c.editing()).toBe(false);http.expectNone(()=>true);
 });
 it('previews category editorial changes locally and persists them only on save',()=>{
  const f=TestBed.createComponent(AdminCategories);http.expectOne(base+'/categories').flush([{...category,erpCategoryId:'7'}]);f.componentInstance.edit({...category,erpCategoryId:'7'});f.detectChanges();
  const headline=f.nativeElement.querySelector('[formControlName=catalogHeadline]') as HTMLInputElement;
  const description=f.nativeElement.querySelector('[formControlName=catalogDescription]') as HTMLTextAreaElement;
  headline.value='Nueva frase';headline.dispatchEvent(new Event('input'));description.value='Nueva descripción';description.dispatchEvent(new Event('input'));f.detectChanges();
  expect(f.nativeElement.querySelector('.catalog-preview').textContent).toContain('Nueva frase');
  expect(f.nativeElement.querySelector('.catalog-preview').textContent).toContain('Nueva descripción');
  http.expectNone(base+'/categories/c1');
  (f.nativeElement.querySelector('button[type=button]') as HTMLButtonElement).click();f.componentInstance.edit({...category,erpCategoryId:'7'});f.detectChanges();
  expect(f.componentInstance.form.controls.catalogHeadline.value).toBe(category.catalogHeadline);
  f.componentInstance.form.patchValue({catalogHeadline:'Nueva frase',catalogDescription:'Nueva descripción'});
  f.componentInstance.save();const request=http.expectOne(base+'/categories/c1');
  expect(request.request.body).toMatchObject({catalogHeadline:'Nueva frase',catalogDescription:'Nueva descripción'});
  request.flush({...category,catalogHeadline:'Nueva frase',catalogDescription:'Nueva descripción'});http.expectOne(base+'/categories').flush([]);
 });
 it('sorts categories only in admin and preserves their public order when editing',()=>{
  const f=TestBed.createComponent(AdminCategories);
  const categories=[{...category,erpCategoryId:'7',name:'Zeta',displayOrder:3},{...category,erpCategoryId:'8',id:'c2',name:'Álbum',displayOrder:9}];
  http.expectOne(base+'/categories').flush(categories);f.detectChanges();
  expect(f.componentInstance.items().map(c=>c.name)).toEqual(['Álbum','Zeta']);
  expect(categories.map(c=>c.name)).toEqual(['Zeta','Álbum']);
  f.componentInstance.edit(categories[0]);f.detectChanges();
  expect(f.nativeElement.querySelector('[formControlName=displayOrder]')).not.toBeNull();
  expect(f.nativeElement.textContent).toContain('Orden');
  f.componentInstance.form.controls.name.setValue('Nueva Zeta');f.componentInstance.save();
  const req=http.expectOne(base+'/categories/c1');
  expect(req.request.body).toMatchObject({name:'Zeta',displayOrder:3});
  req.flush(categories[0]);http.expectOne(base+'/categories').flush(categories);

 });
});
