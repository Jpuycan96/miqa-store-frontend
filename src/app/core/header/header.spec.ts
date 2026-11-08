import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject } from 'rxjs';
import { Header } from './header';
import { provideTestCatalog } from '../../testing/catalog.fixture';
import { mockNativeDialogs } from '../../testing/dialog.fixture';
import { contactWhatsAppUrl } from '../config/whatsapp';
import { routes } from '../../app.routes';
import { ProductCatalog } from '../data/product-catalog';
import { CommercialCategory } from '../../shared/models/product';

describe('Public sidebar header',()=>{
 let restore:()=>void;
 beforeEach(()=>{restore=mockNativeDialogs();TestBed.configureTestingModule({providers:[provideRouter(routes),provideTestCatalog()]});});
 afterEach(()=>{TestBed.resetTestingModule();vi.restoreAllMocks();restore();});
 it('shows logo, menu, persistent global search and cart without horizontal categories',async()=>{
  const f=TestBed.createComponent(Header);await f.whenStable();const el:HTMLElement=f.nativeElement;
  expect(el.querySelector('.brand')?.getAttribute('href')).toBe('/');
  expect(el.querySelector('.menu-toggle')?.textContent).toContain('Menú');
  expect(el.querySelector('#header-product-search')).not.toBeNull();expect(el.querySelector('.quote-toggle')).not.toBeNull();
  expect(el.querySelector('.desktop-nav')).toBeNull();expect(el.querySelector('.top-strip')).toBeNull();
  expect(el.querySelector('app-category-drawer dialog')).toBeNull();
  expect(el.querySelector('.whatsapp')?.getAttribute('href')).toBe(contactWhatsAppUrl());
 });
 it('submits the global search and opens the existing quotation',async()=>{
  const f=TestBed.createComponent(Header);await f.whenStable();const nav=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
  f.componentRef.setInput('catalogMode',true);f.componentInstance.search.setValue('  tarjetas  ');await new Promise(r=>setTimeout(r,300));
  expect(nav).toHaveBeenCalledWith(['productos'],{queryParams:{buscar:'tarjetas'},replaceUrl:true});
  const access=vi.spyOn(f.componentInstance.quotePresentation,'requestPanel');f.nativeElement.querySelector('.quote-toggle').click();await f.whenStable();expect(access).toHaveBeenCalledOnce();
 });
 it('focuses the persistent search without clearing text when the search icon is pressed',async()=>{
  const f=TestBed.createComponent(Header);await f.whenStable();f.componentInstance.search.setValue('tarjetas');
  f.nativeElement.querySelector('.search-toggle').click();await f.whenStable();
  expect(f.componentInstance.search.value).toBe('tarjetas');expect(document.activeElement).toBe(f.nativeElement.querySelector('#header-product-search'));
 });
 it('uses new commercial categories exactly as returned without a historical fallback',async()=>{
  const received=new Subject<readonly CommercialCategory[]>();const source=provideTestCatalog().useValue;const historical=vi.fn(()=>of([]));
  TestBed.overrideProvider(ProductCatalog,{useValue:{...source,categories:historical,commercialCategories:()=>received}});
  const f=TestBed.createComponent(Header);await f.whenStable();f.nativeElement.querySelector('.menu-toggle').click();await f.whenStable();
  expect(f.nativeElement.textContent).toContain('Cargando categorías');
  received.next([{id:'new',erpCategoryId:'99',name:'Nueva categoría real',slug:'slug-real-api',displayOrder:0,subcategories:[]}]);await f.whenStable();
  expect(f.nativeElement.querySelector('.category-option')?.textContent).toContain('Nueva categoría real');
  expect(f.nativeElement.querySelector('.category-option')?.getAttribute('data-category')).toBe('slug-real-api');
  expect(historical).not.toHaveBeenCalled();received.complete();
 });
 it('keeps category and search URL filters functioning without losing the cart',async()=>{
  const h=await RouterTestingHarness.create('/productos?buscar=tarjetas');await h.fixture.whenStable();
  expect(h.routeNativeElement!.querySelectorAll('.catalog-card')).toHaveLength(1);
  await h.navigateByUrl('/productos');await h.fixture.whenStable();expect(h.routeNativeElement!.querySelectorAll('.catalog-card').length).toBeGreaterThan(1);
 });
 it('highlights the current commercial category in the sidebar',async()=>{
  const h=await RouterTestingHarness.create('/productos?commercialCategory=merchandising');await h.fixture.whenStable();
  h.routeNativeElement!.querySelector<HTMLButtonElement>('.menu-toggle')!.click();await h.fixture.whenStable();
  expect(h.routeNativeElement!.querySelector('.category-option.current')?.textContent).toContain('Merchandising');
  expect(h.routeNativeElement!.querySelector('.category-option.current')?.getAttribute('aria-current')).toBe('true');
 });
 it('keeps preview links and clears visual search state with Escape while the field remains available',async()=>{
  const f=TestBed.createComponent(Header);await f.whenStable();f.componentInstance.toggleSearch();f.componentInstance.search.setValue('tarjetas');
  await new Promise(r=>setTimeout(r,300));await f.whenStable();
  expect(f.nativeElement.querySelector('.search-results a').getAttribute('href')).toBe('/productos/tarjetas-personales');
  f.nativeElement.querySelector('#site-search').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await f.whenStable();
  expect(f.componentInstance.searchOpen()).toBe(false);expect(f.componentInstance.search.value).toBe('');
  expect(f.nativeElement.querySelector('#site-search').hidden).toBe(false);
 });
});
