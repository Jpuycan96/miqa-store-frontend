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
 it('lists API products and sends publish action',()=>{
  const f=TestBed.createComponent(AdminProductList);http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products').flush([product]);f.detectChanges();expect(f.nativeElement.textContent).toContain('Producto');
  f.componentInstance.toggle(product,'published');const patch=http.expectOne(base+'/products/p1/published');expect(patch.request.body).toEqual({published:true});patch.flush({...product,published:true});http.expectOne(base+'/products').flush([{...product,published:true}]);expect(f.componentInstance.state().products[0].published).toBe(true);
 });
 it('sorts products and toggles featured through the star independently of publication',()=>{
  const f=TestBed.createComponent(AdminProductList);http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products').flush([{...product,id:'p2',name:'Zeta'},{...product,name:'Álbum'}]);f.detectChanges();
  expect(f.componentInstance.state().products.map(p=>p.name)).toEqual(['Álbum','Zeta']);
  const star=f.nativeElement.querySelector('button.star') as HTMLButtonElement;expect(star.getAttribute('aria-pressed')).toBe('false');star.click();
  const req=http.expectOne(base+'/products/p1/featured');expect(req.request.body).toEqual({featured:true});req.flush({...product,featured:true});http.expectOne(base+'/products').flush([{...product,featured:true}]);f.detectChanges();
  expect(f.nativeElement.querySelector('button.star').getAttribute('aria-pressed')).toBe('true');expect(f.componentInstance.state().products[0].published).toBe(false);
 });
 it('uses a single description and preserves internal order when editing legacy products',()=>{
  route.snapshot.paramMap=convertToParamMap({id:'p1'});const f=TestBed.createComponent(AdminProductForm);http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products/p1').flush({...product,shortDescription:'Legacy text',displayOrder:17});f.detectChanges();
  expect(f.nativeElement.querySelector('[formControlName=shortDescription]')).toBeNull();expect(f.nativeElement.querySelector('app-admin-product-form > form [formControlName=displayOrder]')).toBeNull();
  expect(f.componentInstance.form.controls.description.value).toBe('Legacy text');
  f.componentInstance.form.controls.description.setValue('a'.repeat(600));f.componentInstance.save();const req=http.expectOne(base+'/products/p1');expect(req.request.body).toMatchObject({description:'a'.repeat(600),shortDescription:'a'.repeat(500),displayOrder:17});req.flush(product);
 });
 it('creates a product, preserves manual slug and enforces PACK fields',()=>{
  const f=TestBed.createComponent(AdminProductForm);http.expectOne(base+'/categories').flush([category]);const c=f.componentInstance;
  c.form.patchValue({name:'Producto nuevo',categoryId:'c1'});c.nameChanged();expect(c.form.controls.slug.value).toBe('producto-nuevo');c.form.controls.slug.setValue('manual');c.slugChanged();c.form.controls.name.setValue('Otro nombre');c.nameChanged();expect(c.form.controls.slug.value).toBe('manual');
  c.form.controls.saleType.setValue('PACK');c.changeType();expect(c.form.invalid).toBe(true);c.form.patchValue({packSize:1000,packLabel:'millar'});expect(c.form.valid).toBe(true);
  c.form.controls.saleType.setValue('AREA');c.changeType();expect(c.form.controls.packSize.value).toBe(1000);const nav=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);c.save();
  const req=http.expectOne(base+'/products');expect(req.request.method).toBe('POST');expect(req.request.body).toMatchObject({saleType:'AREA',packSize:null,packLabel:null,slug:'manual'});req.flush({...product,saleType:'AREA'});expect(nav).toHaveBeenCalledWith(['/admin/productos','p1','editar']);
 });
 it('starts new sections open, keeps form values while toggling, summarizes them and collapses after save',()=>{
  const nav=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);const f=TestBed.createComponent(AdminProductForm);http.expectOne(base+'/categories').flush([category]);f.detectChanges();const c=f.componentInstance;
  expect(c.generalOpen()).toBe(true);expect(c.salesOpen()).toBe(true);expect(f.nativeElement.querySelector('#general-product-fields')).toBeTruthy();
  c.form.patchValue({name:'Llavero destapador',categoryId:'c1',slug:'llavero',unitLabel:'unidad',minQuantity:100,quantityStep:50});f.detectChanges();
  const toggles=f.nativeElement.querySelectorAll('.section-toggle') as NodeListOf<HTMLButtonElement>;toggles[0].click();toggles[1].click();f.detectChanges();
  expect(toggles[0].getAttribute('aria-expanded')).toBe('false');expect(f.nativeElement.textContent).toContain('Llavero destapador · Categoría');expect(f.nativeElement.textContent).toContain('Por unidad · mínimo 100 · incrementos de 50');expect(c.form.controls.name.value).toBe('Llavero destapador');http.expectNone(base+'/products');
  toggles[0].click();toggles[1].click();expect(c.form.controls.name.value).toBe('Llavero destapador');c.save();http.expectOne(base+'/products').flush({...product,name:'Llavero destapador',minQuantity:100,quantityStep:50});
  expect(c.generalOpen()).toBe(false);expect(c.salesOpen()).toBe(false);expect(nav).toHaveBeenCalled();
 });
 it('starts an existing product with the main sections collapsed and allows expansion',()=>{
  route.snapshot.paramMap=convertToParamMap({id:'p1'});const f=TestBed.createComponent(AdminProductForm);http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products/p1').flush(product);f.detectChanges();
  expect(f.componentInstance.generalOpen()).toBe(false);expect(f.componentInstance.salesOpen()).toBe(false);const toggle=f.nativeElement.querySelector('.section-toggle') as HTMLButtonElement;toggle.click();f.detectChanges();expect(toggle.getAttribute('aria-expanded')).toBe('true');expect(f.nativeElement.querySelector('#general-product-fields')).toBeTruthy();
 });
 it('edits existing product and retains SEO and inactive options',()=>{
  route.snapshot.paramMap=convertToParamMap({id:'p1'});const f=TestBed.createComponent(AdminProductForm);http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products/p1').flush({...product,seoTitle:'Existing SEO',materials:[{id:'m1',name:'Hidden',active:false,displayOrder:0}]});
  f.componentInstance.form.controls.name.setValue('Editado');f.componentInstance.save();const req=http.expectOne(base+'/products/p1');expect(req.request.method).toBe('PUT');expect(req.request.body.seoTitle).toBe('Existing SEO');req.flush({...product,name:'Editado'});expect(f.componentInstance.message()).toContain('guardado');
 });
 it('creates and deactivates categories through API',()=>{
  const f=TestBed.createComponent(AdminCategories);http.expectOne(base+'/categories').flush([]);const c=f.componentInstance;c.edit();c.form.controls.name.setValue('Nueva categoría');c.nameChanged();expect(c.form.controls.slug.value).toBe('nueva-categoria');c.save();const req=http.expectOne(base+'/categories');expect(req.request.method).toBe('POST');req.flush(category);http.expectOne(base+'/categories').flush([category]);c.toggle(category);http.expectOne(base+'/categories/c1/active').flush({...category,active:false});http.expectOne(base+'/categories').flush([{...category,active:false}]);expect(c.items()[0].active).toBe(false);
 });
 it('previews category editorial changes locally and persists them only on save',()=>{
  const f=TestBed.createComponent(AdminCategories);http.expectOne(base+'/categories').flush([category]);f.componentInstance.edit(category);f.detectChanges();
  const headline=f.nativeElement.querySelector('[formControlName=catalogHeadline]') as HTMLInputElement;
  const description=f.nativeElement.querySelector('[formControlName=catalogDescription]') as HTMLTextAreaElement;
  headline.value='Nueva frase';headline.dispatchEvent(new Event('input'));description.value='Nueva descripción';description.dispatchEvent(new Event('input'));f.detectChanges();
  expect(f.nativeElement.querySelector('.catalog-preview').textContent).toContain('Nueva frase');
  expect(f.nativeElement.querySelector('.catalog-preview').textContent).toContain('Nueva descripción');
  http.expectNone(base+'/categories/c1');
  (f.nativeElement.querySelector('button[type=button]') as HTMLButtonElement).click();f.componentInstance.edit(category);f.detectChanges();
  expect(f.componentInstance.form.controls.catalogHeadline.value).toBe(category.catalogHeadline);
  f.componentInstance.form.patchValue({catalogHeadline:'Nueva frase',catalogDescription:'Nueva descripción'});
  f.componentInstance.save();const request=http.expectOne(base+'/categories/c1');
  expect(request.request.body).toMatchObject({catalogHeadline:'Nueva frase',catalogDescription:'Nueva descripción'});
  request.flush({...category,catalogHeadline:'Nueva frase',catalogDescription:'Nueva descripción'});http.expectOne(base+'/categories').flush([]);
 });
 it('sorts categories only in admin and preserves their public order when editing',()=>{
  const f=TestBed.createComponent(AdminCategories);
  const categories=[{...category,name:'Zeta',displayOrder:3},{...category,id:'c2',name:'Álbum',displayOrder:9}];
  http.expectOne(base+'/categories').flush(categories);f.detectChanges();
  expect(f.componentInstance.items().map(c=>c.name)).toEqual(['Álbum','Zeta']);
  expect(categories.map(c=>c.name)).toEqual(['Zeta','Álbum']);
  f.componentInstance.edit(categories[0]);f.detectChanges();
  expect(f.nativeElement.querySelector('[formControlName=displayOrder]')).toBeNull();
  expect(f.nativeElement.textContent).not.toContain('Orden');
  f.componentInstance.form.controls.name.setValue('Nueva Zeta');f.componentInstance.save();
  const req=http.expectOne(base+'/categories/c1');
  expect(req.request.body).toMatchObject({name:'Nueva Zeta',displayOrder:3});
  req.flush(categories[0]);http.expectOne(base+'/categories').flush(categories);
  f.componentInstance.edit();f.componentInstance.form.patchValue({name:'Nueva',slug:'nueva'});f.componentInstance.save();
  const create=http.expectOne(base+'/categories');expect(create.request.body.displayOrder).toBe(0);
  create.flush(category);http.expectOne(base+'/categories').flush(categories);
 });
});
