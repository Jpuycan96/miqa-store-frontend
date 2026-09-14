import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Header } from './header';
import { provideTestCatalog } from '../../testing/catalog.fixture';
import { PRODUCT_CATEGORIES } from '../data/products.mock';
import { contactWhatsAppUrl } from '../config/whatsapp';
import { routes } from '../../app.routes';

describe('Public header',()=>{
 beforeEach(()=>TestBed.configureTestingModule({providers:[provideRouter(routes),provideTestCatalog()]}));
 it('uses API categories, all products and safe pending destinations',async()=>{
  const f=TestBed.createComponent(Header);await f.whenStable();
  const el:HTMLElement=f.nativeElement;
  const links=el.querySelectorAll<HTMLAnchorElement>('.desktop-nav a');
  expect(links.length).toBe(Math.min(6,PRODUCT_CATEGORIES.length)+1);
  expect(links[0].getAttribute('href')).toBe('/productos?categoria='+PRODUCT_CATEGORIES[0].slug);
  expect(links[links.length-1].getAttribute('href')).toBe('/productos');
  expect(el.querySelectorAll('.top-strip [aria-disabled=true]')).toHaveLength(2);
  expect(el.querySelector('.top-strip a')?.getAttribute('href')).toBe('/');
  expect(el.querySelector('.contact-button')).toBeNull();
  expect(el.querySelector('.whatsapp')?.getAttribute('href')).toBe(contactWhatsAppUrl());
 });
 it('submits the header search to the existing catalog and opens quotation',async()=>{
  const f=TestBed.createComponent(Header);await f.whenStable();
  const nav=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
  f.componentInstance.search.setValue('  tarjetas  ');f.componentInstance.submitSearch();
  expect(nav).toHaveBeenCalledWith(['/productos'],{queryParams:{buscar:'tarjetas'}});
  const open=vi.spyOn(f.componentInstance.quote,'open');f.nativeElement.querySelector('.quote-toggle').click();expect(open).toHaveBeenCalledOnce();
 });
 it('filters products through the search URL and clears filters with Todos',async()=>{
  const h=await RouterTestingHarness.create('/productos?buscar=tarjetas');
  await new Promise(resolve=>setTimeout(resolve,350));await h.fixture.whenStable();
  expect(h.routeNativeElement!.querySelector<HTMLInputElement>('#product-search')!.value).toBe('tarjetas');
  expect(h.routeNativeElement!.querySelectorAll('.catalog-card')).toHaveLength(1);
  await h.navigateByUrl('/productos');await new Promise(resolve=>setTimeout(resolve,350));await h.fixture.whenStable();
  expect(h.routeNativeElement!.querySelectorAll('.catalog-card').length).toBeGreaterThan(1);
 });
});
