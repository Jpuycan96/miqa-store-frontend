import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject } from 'rxjs';
import { routes } from '../../app.routes';
import { ProductCatalog } from '../data/product-catalog';
import { provideTestCatalog } from '../../testing/catalog.fixture';
import { mockNativeDialogs } from '../../testing/dialog.fixture';
import { CommercialCategory } from '../../shared/models/product';
import { Header } from './header';
import { CategoryDrawer } from './category-drawer';
import { QuoteStore } from '../quote/quote-store';
import { PRODUCTS } from '../data/products.mock';

const category=(name:string,id:string,count:number):CommercialCategory=>({id:'local-'+id,erpCategoryId:id,name,slug:id==='9'?'acrilicos':name.toLowerCase(),displayOrder:0,
 subcategories:Array.from({length:count},(_,i)=>({erpSubcategoryId:id==='9'?'49':id+'-'+i,erpCategoryId:id,name:id==='9'?'Productos acrílicos':'Subcategoría larga '+i,slug:id==='9'?'subcategoria-49':'slug-api-'+id+'-'+i,displayOrder:i}))});
const tree=[category('Acrílicos','9',1),category('Merchandising','2',32),category('Papelería','6',40)];
describe('Commercial sidebar and mega menu',()=>{
 let restore:()=>void;
 beforeEach(()=>{restore=mockNativeDialogs();localStorage.clear();sessionStorage.clear();});
 afterEach(()=>{TestBed.resetTestingModule();vi.restoreAllMocks();restore();localStorage.clear();sessionStorage.clear();});
 function setup(){
  const source=provideTestCatalog().useValue;const commercialCategories=vi.fn(()=>of<readonly CommercialCategory[]>(tree));const categories=vi.fn(source.categories);const list=vi.fn(source.list);
  TestBed.configureTestingModule({providers:[provideRouter(routes),{provide:ProductCatalog,useValue:{...source,categories,commercialCategories,list}}]});return {commercialCategories,categories,list};
 }
 async function create(){setup();const f=TestBed.createComponent(Header);await f.whenStable();f.nativeElement.querySelector('.menu-toggle').focus();f.nativeElement.querySelector('.menu-toggle').click();await f.whenStable();return f;}
 it('opens a modal, locks scroll, closes with X or Escape and restores focus',async()=>{
  const f=await create();expect(f.nativeElement.querySelector('dialog').open).toBe(true);expect(document.body.style.overflow).toBe('hidden');
  expect(f.nativeElement.querySelector('.greeting h2').textContent).toContain('¡Hola!');
  f.nativeElement.querySelector('.close-menu').click();await f.whenStable();expect(f.nativeElement.querySelector('dialog')).toBeNull();
  expect(document.activeElement).toBe(f.nativeElement.querySelector('.menu-toggle'));expect(document.body.style.overflow).toBe('');
  f.nativeElement.querySelector('.menu-toggle').click();await f.whenStable();f.nativeElement.querySelector('dialog').dispatchEvent(new Event('cancel',{cancelable:true}));await f.whenStable();
  expect(f.componentInstance.menuOpen()).toBe(false);expect(document.activeElement).toBe(f.nativeElement.querySelector('.menu-toggle'));
 });
 it('restores focus to Menu even if the search input had focus before a pointer click',async()=>{
  setup();const f=TestBed.createComponent(Header);await f.whenStable();
  f.nativeElement.querySelector('#header-product-search').focus();f.nativeElement.querySelector('.menu-toggle').click();await f.whenStable();
  f.nativeElement.querySelector('.close-menu').click();await f.whenStable();
  expect(document.activeElement).toBe(f.nativeElement.querySelector('.menu-toggle'));
 });
 it('opens a desktop category on hover and preserves real Acrílicos IDs, slugs and single child',async()=>{
  const f=await create();const option=f.nativeElement.querySelector('[data-category="acrilicos"]');
  const hover=new Event('pointerenter');Object.defineProperty(hover,'pointerType',{value:'mouse'});option.dispatchEvent(hover);await f.whenStable();
  expect(f.nativeElement.querySelector('.mega-title h2').textContent).toBe('Acrílicos');
  const links=f.nativeElement.querySelectorAll('.subcategory-title');expect(links).toHaveLength(1);
  expect(links[0].textContent).toBe('Productos acrílicos');expect(links[0].getAttribute('href')).toBe('/productos?commercialCategory=acrilicos&subcategory=subcategoria-49');
  expect(f.nativeElement.querySelector('.category-all').getAttribute('href')).toBe('/productos?commercialCategory=acrilicos');
 });
 it('renders every received child for large categories without fictional groups or empty columns',async()=>{
  const f=await create();for(const [slug,count] of [['merchandising',32],['papelería',40]] as const){
   f.nativeElement.querySelector(`[data-category="${slug}"]`).click();await f.whenStable();expect(f.nativeElement.querySelectorAll('.subcategory-group')).toHaveLength(count);
  }
 });
 it('starts each newly selected category at the top while retaining independent list scrolling',async()=>{
  const f=await create();f.nativeElement.querySelector('[data-category="merchandising"]').click();await f.whenStable();
  const body=f.nativeElement.querySelector('.mega-body') as HTMLElement;body.scrollTop=400;
  f.nativeElement.querySelector('[data-category="papeler\u00eda"]').click();await f.whenStable();
  expect((f.nativeElement.querySelector('.mega-body') as HTMLElement).scrollTop).toBe(0);
 });
 it('uses the same surface with a back button on mobile and ignores hover',async()=>{
  const f=await create();const drawer=f.debugElement.query(By.directive(CategoryDrawer)).componentInstance as CategoryDrawer;drawer.mobile.set(true);
  const button=f.nativeElement.querySelector('.category-option');button.focus();const hover=new Event('pointerenter');Object.defineProperty(hover,'pointerType',{value:'mouse'});button.dispatchEvent(hover);await f.whenStable();
  expect(drawer.selectedCategory()).toBeUndefined();button.click();await f.whenStable();expect(drawer.selectedCategory()?.slug).toBe('acrilicos');
  expect(document.activeElement).toBe(f.nativeElement.querySelector('.back-categories'));
  f.nativeElement.querySelector('.back-categories').click();await f.whenStable();expect(drawer.selectedCategory()).toBeUndefined();expect(document.activeElement).toBe(button);
 });
 it('supports arrow navigation and closes by clicking only outside the dialog',async()=>{
  const f=await create();const buttons=f.nativeElement.querySelectorAll('.category-option');buttons[0].focus();
  buttons[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));expect(document.activeElement).toBe(buttons[1]);
  buttons[1].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));await f.whenStable();expect(f.nativeElement.querySelector('.mega-title h2').textContent).toBe('Merchandising');
  const dialog=f.nativeElement.querySelector('dialog') as HTMLDialogElement;vi.spyOn(dialog,'getBoundingClientRect').mockReturnValue({left:0,top:0,right:800,bottom:700} as DOMRect);
  dialog.dispatchEvent(new MouseEvent('click',{clientX:100,clientY:100}));expect(f.componentInstance.menuOpen()).toBe(true);
  dialog.dispatchEvent(new MouseEvent('click',{clientX:900,clientY:100}));await f.whenStable();expect(f.componentInstance.menuOpen()).toBe(false);
 });
 it('navigates commercial subcategories and Ver todos with search preserved, without touching the quote',async()=>{
  const {list}=setup();const h=await RouterTestingHarness.create('/productos?buscar=tarjetas');await h.fixture.whenStable();
  const store=TestBed.inject(QuoteStore);store.addItem(PRODUCTS[2],{quantity:2});const saved=store.items();
  const open=async()=>{h.routeNativeElement!.querySelector<HTMLButtonElement>('.menu-toggle')!.click();await h.fixture.whenStable();h.routeNativeElement!.querySelector<HTMLButtonElement>('[data-category="acrilicos"]')!.click();await h.fixture.whenStable();};
  await open();h.routeNativeElement!.querySelector<HTMLAnchorElement>('.category-all')!.click();await h.fixture.whenStable();
  expect(TestBed.inject(Router).url).toBe('/productos?commercialCategory=acrilicos&buscar=tarjetas');expect(h.routeNativeElement!.querySelector('app-category-drawer dialog')).toBeNull();
  await open();h.routeNativeElement!.querySelector<HTMLAnchorElement>('.subcategory-title')!.click();await h.fixture.whenStable();
  expect(TestBed.inject(Router).url).toBe('/productos?commercialCategory=acrilicos&subcategory=subcategoria-49&buscar=tarjetas');
  expect(list).toHaveBeenLastCalledWith({category:'',search:'tarjetas',commercialCategory:'acrilicos',subcategory:'subcategoria-49'},{fresh:false});
  expect(store.items()).toEqual(saved);await open();h.routeNativeElement!.querySelector<HTMLAnchorElement>('.all-products')!.click();await h.fixture.whenStable();expect(TestBed.inject(Router).url).toBe('/productos');
 });
 it('does not fall back to historical categories on empty data or errors, and supports retry',async()=>{
  const {commercialCategories,categories}=setup();const pending=new Subject<readonly CommercialCategory[]>();commercialCategories.mockReturnValueOnce(pending);
  const f=TestBed.createComponent(Header);await f.whenStable();f.nativeElement.querySelector('.menu-toggle').click();await f.whenStable();
  expect(f.nativeElement.textContent).toContain('Cargando categorías');pending.error(new Error('offline'));await f.whenStable();expect(f.nativeElement.querySelector('[role=alert]')).not.toBeNull();
  commercialCategories.mockReturnValueOnce(of([]));f.nativeElement.querySelector('.retry').click();await f.whenStable();
  expect(f.nativeElement.textContent).toContain('Actualmente no hay categorías');expect(f.nativeElement.querySelectorAll('.category-option')).toHaveLength(0);expect(categories).not.toHaveBeenCalled();
 });
 it('includes categories arriving later from the API without changing their custom slugs',async()=>{
  const {commercialCategories,categories}=setup();const pending=new Subject<readonly CommercialCategory[]>();commercialCategories.mockReturnValueOnce(pending);
  const f=TestBed.createComponent(Header);await f.whenStable();f.nativeElement.querySelector('.menu-toggle').click();await f.whenStable();
  pending.next([{...tree[0],erpCategoryId:'99',name:'Nueva desde API',slug:'categoria-especial',subcategories:[{...tree[0].subcategories[0],erpCategoryId:'99',erpSubcategoryId:'999',slug:'hija-personalizada'}]}]);await f.whenStable();
  f.nativeElement.querySelector('.category-option').click();await f.whenStable();expect(f.nativeElement.querySelector('.subcategory-title').getAttribute('href')).toBe('/productos?commercialCategory=categoria-especial&subcategory=hija-personalizada');expect(categories).not.toHaveBeenCalled();
 });
 it('restores scrolling on destruction even if the menu is still open',async()=>{const f=await create();f.destroy();expect(document.body.style.overflow).toBe('');});
 it('treats the transparent area above the desktop panel as outside the menu',async()=>{
  const f=await create();f.nativeElement.querySelector('[data-category="acrilicos"]').click();await f.whenStable();
  const panel=f.nativeElement.querySelector('.mega-panel') as HTMLElement;
  vi.spyOn(panel,'getBoundingClientRect').mockReturnValue({left:270,top:60,right:1180,bottom:900} as DOMRect);
  f.nativeElement.querySelector('.drawer-layout').dispatchEvent(new MouseEvent('click',{clientX:500,clientY:20,bubbles:true}));
  await f.whenStable();expect(f.componentInstance.menuOpen()).toBe(false);
  expect(document.activeElement).toBe(f.nativeElement.querySelector('.menu-toggle'));
 });
 it('debounces hover, displays real product links and clears them on category changes without losing the quote',async()=>{
  const {list}=setup();
  const product={...PRODUCTS[0],id:'real-product',slug:'real-product-slug',name:'Producto recibido de API',categorySlug:'otra-principal',published:true};
  list.mockReturnValue(of([product]));
  const f=TestBed.createComponent(Header);await f.whenStable();
  f.nativeElement.querySelector('.menu-toggle').click();await f.whenStable();
  const store=TestBed.inject(QuoteStore);store.addItem(PRODUCTS[2],{quantity:2});const saved=store.items();
  vi.useFakeTimers();
  try{
   f.nativeElement.querySelector('[data-category="merchandising"]').click();f.detectChanges();
   f.nativeElement.querySelector('[data-category="acrilicos"]').click();f.detectChanges();
   expect(list).not.toHaveBeenCalled();
   await vi.advanceTimersByTimeAsync(180);f.detectChanges();
   expect(list).toHaveBeenCalledExactlyOnceWith({commercialCategory:'acrilicos',subcategory:'subcategoria-49'},{fresh:true});
   const link=f.nativeElement.querySelector('.product-links a');expect(link.textContent).toBe(product.name);
   expect(link.getAttribute('href')).toBe('/productos/real-product-slug');
   f.nativeElement.querySelector('[data-category="papeler\u00eda"]').click();f.detectChanges();
   expect(f.nativeElement.querySelector('.product-links a')).toBeNull();
   f.nativeElement.querySelector('.close-menu').click();f.detectChanges();
   await vi.advanceTimersByTimeAsync(200);expect(list).toHaveBeenCalledTimes(1);
   expect(store.items()).toEqual(saved);
  }finally{vi.useRealTimers();}
 });
});
