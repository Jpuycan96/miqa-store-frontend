import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { AdminProductForm } from './product-form';
import { AdminProductList } from './product-list';
import { AdminCategories } from './categories';
import { AdminProduct } from './admin.models';
const base='https://api-store.solucionesmicaela.com/api/admin';
const category={id:'c1',name:'Categoría',slug:'categoria',description:'',active:true,displayOrder:0};
const product:AdminProduct={id:'p1',categoryId:'c1',category,name:'Producto',slug:'producto',shortDescription:'',description:'',saleType:'QUANTITY',unitLabel:'unidad',packSize:null,packLabel:null,minQuantity:1,quantityStep:1,published:false,featured:false,displayOrder:0,seoTitle:'',seoDescription:'',image:'',materials:[],extras:[],images:[]};
describe('Admin catalog forms',()=>{
 let http:HttpTestingController;
 let route={snapshot:{paramMap:convertToParamMap({})}};
 beforeEach(()=>{route={snapshot:{paramMap:convertToParamMap({})}};TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),{provide:ActivatedRoute,useValue:route}]});http=TestBed.inject(HttpTestingController);});
 afterEach(()=>http.verify());
 it('lists API products and sends publish action',()=>{
  const f=TestBed.createComponent(AdminProductList);http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products').flush([product]);f.detectChanges();expect(f.nativeElement.textContent).toContain('Producto');
  f.componentInstance.toggle(product,'published');const patch=http.expectOne(base+'/products/p1/published');expect(patch.request.body).toEqual({published:true});patch.flush({...product,published:true});http.expectOne(base+'/products').flush([{...product,published:true}]);expect(f.componentInstance.state().products[0].published).toBe(true);
 });
 it('creates a product, preserves manual slug and enforces PACK fields',()=>{
  const f=TestBed.createComponent(AdminProductForm);http.expectOne(base+'/categories').flush([category]);const c=f.componentInstance;
  c.form.patchValue({name:'Producto nuevo',categoryId:'c1'});c.nameChanged();expect(c.form.controls.slug.value).toBe('producto-nuevo');c.form.controls.slug.setValue('manual');c.slugChanged();c.form.controls.name.setValue('Otro nombre');c.nameChanged();expect(c.form.controls.slug.value).toBe('manual');
  c.form.controls.saleType.setValue('PACK');c.changeType();expect(c.form.invalid).toBe(true);c.form.patchValue({packSize:1000,packLabel:'millar'});expect(c.form.valid).toBe(true);
  c.form.controls.saleType.setValue('AREA');c.changeType();expect(c.form.controls.packSize.value).toBe(1000);const nav=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);c.save();
  const req=http.expectOne(base+'/products');expect(req.request.method).toBe('POST');expect(req.request.body).toMatchObject({saleType:'AREA',packSize:null,packLabel:null,slug:'manual'});req.flush({...product,saleType:'AREA'});expect(nav).toHaveBeenCalledWith(['/admin/productos','p1','editar']);
 });
 it('edits existing product and retains SEO and inactive options',()=>{
  route.snapshot.paramMap=convertToParamMap({id:'p1'});const f=TestBed.createComponent(AdminProductForm);http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products/p1').flush({...product,seoTitle:'Existing SEO',materials:[{id:'m1',name:'Hidden',active:false,displayOrder:0}]});
  f.componentInstance.form.controls.name.setValue('Editado');f.componentInstance.save();const req=http.expectOne(base+'/products/p1');expect(req.request.method).toBe('PUT');expect(req.request.body.seoTitle).toBe('Existing SEO');req.flush({...product,name:'Editado'});expect(f.componentInstance.message()).toContain('guardado');
 });
 it('creates and deactivates categories through API',()=>{
  const f=TestBed.createComponent(AdminCategories);http.expectOne(base+'/categories').flush([]);const c=f.componentInstance;c.edit();c.form.controls.name.setValue('Nueva categoría');c.nameChanged();expect(c.form.controls.slug.value).toBe('nueva-categoria');c.save();const req=http.expectOne(base+'/categories');expect(req.request.method).toBe('POST');req.flush(category);http.expectOne(base+'/categories').flush([category]);c.toggle(category);http.expectOne(base+'/categories/c1/active').flush({...category,active:false});http.expectOne(base+'/categories').flush([{...category,active:false}]);expect(c.items()[0].active).toBe(false);
 });
});
