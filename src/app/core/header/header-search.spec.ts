import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '../../app.routes';
import { ProductCatalog, CatalogFilters } from '../data/product-catalog';
import { PRODUCTS, PRODUCT_CATEGORIES } from '../data/products.mock';
import { QuoteStore, QUOTE_STORAGE_KEY } from '../quote/quote-store';
import { Header } from './header';

const bags = [
  { ...PRODUCTS[0], id:'featured-bags',slug:'featured-bags',name:'Z Bolsas destacadas',featured:true,categorySlug:'merchandising' },
  { ...PRODUCTS[0], id:'ordinary-bags',slug:'ordinary-bags',name:'A Bolsas',featured:false,categorySlug:'merchandising' }
];
const products = [...bags,...PRODUCTS];

describe('Global header search lifecycle', () => {
  const wait = () => new Promise(resolve=>setTimeout(resolve,320));
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); });
  function setup() {
    const list=vi.fn((filters:CatalogFilters={})=>of(products.filter(p=>
      (!filters.category || p.categorySlug===filters.category)
      && (!filters.commercialCategory || p.categorySlug===filters.commercialCategory)
      && (!filters.search || p.name.toLowerCase().includes(filters.search.toLowerCase())))));
    TestBed.configureTestingModule({providers:[provideRouter(routes),{provide:ProductCatalog,useValue:{
      list,categories:()=>of(PRODUCT_CATEGORIES),commercialCategories:()=>of([]),
      findBySlug:(slug:string)=>of(products.find(p=>p.slug===slug))
    }}]});
    return list;
  }
  it.each([
    '/productos/imprenta-papeleria',
    '/productos?categoria=imprenta-papeleria&page=2',
    '/productos?commercialCategory=papeleria&subcategory=subcategoria-10&foo=old&page=2'
  ])('searches all publications from %s and preserves quote and API order',async url=>{
    const list=setup(); const h=await RouterTestingHarness.create(url);await h.fixture.whenStable();
    const store=TestBed.inject(QuoteStore);store.addItem(PRODUCTS[2],{quantity:2});await h.fixture.whenStable();
    const saved=structuredClone(store.items());
    h.routeNativeElement!.querySelector<HTMLButtonElement>('.search-toggle')!.click();await h.fixture.whenStable();
    const input=h.routeNativeElement!.querySelector<HTMLInputElement>('#header-product-search')!;
    input.value='bolsas';input.dispatchEvent(new Event('input'));await wait();await h.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/productos?buscar=bolsas');
    expect(list).toHaveBeenLastCalledWith({category:'',search:'bolsas'},{fresh:false});
    expect([...h.routeNativeElement!.querySelectorAll('.catalog-card')].map(card=>card.getAttribute('data-product')))
      .toEqual(['featured-bags','ordinary-bags']);
    expect(input.value).toBe('bolsas');expect(input.closest<HTMLElement>('#site-search')!.hidden).toBe(false);
    expect(store.items()).toEqual(saved);expect(store.totalItems()).toBe(1);
    expect(JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY)!)).toEqual(saved);
    h.routeNativeElement!.querySelector<HTMLAnchorElement>('.product-image')!.click();await h.fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain('/productos/featured-bags');
    expect(decodeURIComponent(TestBed.inject(Router).url)).toContain('/productos?buscar=bolsas');
    expect(input.value).toBe('');expect(input.closest<HTMLElement>('#site-search')!.hidden).toBe(true);
    h.routeNativeElement!.querySelector<HTMLAnchorElement>('.return-products')!.click();await h.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/productos?buscar=bolsas');
    expect(input.value).toBe('');expect(input.closest<HTMLElement>('#site-search')!.hidden).toBe(true);
    h.routeNativeElement!.querySelector<HTMLButtonElement>('.search-toggle')!.click();await h.fixture.whenStable();
    expect(input.closest<HTMLElement>('#site-search')!.hidden).toBe(false);
    expect(store.items()).toEqual(saved);
  });
  it('closes and clears after selecting a preview result, with keyboard links intact',async()=>{
    setup();const h=await RouterTestingHarness.create('/');await h.fixture.whenStable();
    const header=h.fixture.debugElement.query(By.directive(Header)).componentInstance as Header;
    header.toggleSearch();header.search.setValue('bolsas');await wait();await h.fixture.whenStable();
    const result=h.routeNativeElement!.querySelector<HTMLAnchorElement>('.search-results a')!;
    expect(result.getAttribute('href')).toBe('/productos/featured-bags');
    result.focus();expect(document.activeElement).toBe(result);result.click();await h.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/productos/featured-bags');
    const next=h.fixture.debugElement.query(By.directive(Header)).componentInstance as Header;
    expect(next.searchOpen()).toBe(false);expect(next.search.value).toBe('');
  });
  it('Escape clears the visual text, restores focus and cancels a pending search navigation',async()=>{
    const list=setup();const h=await RouterTestingHarness.create('/productos?commercialCategory=papeleria');await h.fixture.whenStable();
    const original=TestBed.inject(Router).url;list.mockClear();
    const header=h.fixture.debugElement.query(By.directive(Header)).componentInstance as Header;
    header.toggleSearch();header.search.setValue('bolsas');
    h.routeNativeElement!.querySelector('#site-search')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    await wait();await h.fixture.whenStable();
    expect(header.search.value).toBe('');expect(header.searchOpen()).toBe(false);
    expect(document.activeElement).toBe(h.routeNativeElement!.querySelector('.search-toggle'));
    expect(TestBed.inject(Router).url).toBe(original);expect(list).not.toHaveBeenCalled();
    header.toggleSearch();await h.fixture.whenStable();expect(header.searchOpen()).toBe(true);
  });
});
