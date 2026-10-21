import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { routes } from '../../app.routes';
import { ProductCatalog } from '../data/product-catalog';
import { provideTestCatalog } from '../../testing/catalog.fixture';
import { CommercialCategory } from '../../shared/models/product';
import { Header } from './header';

const tree: readonly CommercialCategory[] = [
  {id:'local',erpCategoryId:'8',name:'Comercial',slug:'comercial',displayOrder:0,subcategories:[
    {erpSubcategoryId:'10',erpCategoryId:'8',name:'Primera',slug:'subcategoria-10',displayOrder:0},
    {erpSubcategoryId:'11',erpCategoryId:'8',name:'Segunda',slug:'subcategoria-11',displayOrder:1}]},
  {id:'empty',erpCategoryId:'9',name:'Sin subcategorías',slug:'sin-subcategorias',displayOrder:1,subcategories:[]}
];

describe('Commercial dropdown navigation',()=>{
  function setup() {
    const source=provideTestCatalog().useValue;
    const commercialCategories=vi.fn(()=>of(tree));
    const categories=vi.fn(source.categories);
    const list=vi.fn(source.list);
    TestBed.configureTestingModule({providers:[provideRouter(routes),{provide:ProductCatalog,useValue:{...source,categories,commercialCategories,list}}]});
    return {commercialCategories,categories,list};
  }
  it('opens on mouse hover, stays open through its options, and closes with Escape and restored focus',async()=>{
    setup();const f=TestBed.createComponent(Header);await f.whenStable();
    const wrapper:HTMLElement=f.nativeElement.querySelector('.category-menu');
    const enter=new Event('pointerenter');Object.defineProperty(enter,'pointerType',{value:'mouse'});
    wrapper.dispatchEvent(enter);await f.whenStable();
    const toggle=wrapper.querySelector<HTMLButtonElement>('button')!;
    const dropdown=wrapper.querySelector<HTMLUListElement>('ul')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');expect(dropdown.hidden).toBe(false);
    const first=dropdown.querySelector<HTMLAnchorElement>('a')!;first.focus();await f.whenStable();
    expect(dropdown.hidden).toBe(false);
    first.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await f.whenStable();
    expect(dropdown.hidden).toBe(true);expect(document.activeElement).toBe(toggle);
    toggle.click();await f.whenStable();expect(dropdown.hidden).toBe(false);
    wrapper.dispatchEvent(new Event('pointerleave'));await f.whenStable();expect(dropdown.hidden).toBe(true);
    const empty=f.nativeElement.querySelectorAll('.category-menu')[1];
    expect(empty.querySelector('ul')).toBeNull();expect(empty.querySelector('button')).toBeNull();
  });
  it('supports mobile touch toggles, keyboard opening, and unique controls',async()=>{
    setup();const f=TestBed.createComponent(Header);await f.whenStable();
    f.nativeElement.querySelector('.mobile-toggle').click();await f.whenStable();
    const toggle:HTMLButtonElement=f.nativeElement.querySelector('.mobile-category button');
    const target=()=>f.nativeElement.querySelector('#'+toggle.getAttribute('aria-controls')) as HTMLUListElement;
    expect(target().hidden).toBe(true);toggle.click();await f.whenStable();expect(target().hidden).toBe(false);
    toggle.click();await f.whenStable();expect(target().hidden).toBe(true);
    const desktop:HTMLButtonElement=f.nativeElement.querySelector('.desktop-nav button');
    desktop.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));await f.whenStable();
    expect(desktop.getAttribute('aria-expanded')).toBe('true');
    expect(desktop.getAttribute('aria-controls')).not.toBe(toggle.getAttribute('aria-controls'));
  });
  it('combines URL filters and search, preserves detail return links, and clears everything with Todos',async()=>{
    const {list,commercialCategories}=setup();
    const h=await RouterTestingHarness.create('/productos?commercialCategory=comercial&subcategory=subcategoria-10&buscar=tarjetas');
    await h.fixture.whenStable();
    expect(list).toHaveBeenCalledExactlyOnceWith({category:'',commercialCategory:'comercial',subcategory:'subcategoria-10',search:'tarjetas'},{fresh:false});
    const el=h.routeNativeElement!;
    expect(el.querySelector('.desktop-nav .category-link.active')?.textContent).toBe('Comercial');
    expect(el.querySelector('.desktop-nav .subcategory-dropdown a.active')?.textContent).toBe('Primera');
    expect(el.querySelectorAll('.catalog-card')).toHaveLength(1);
    const detail=el.querySelector<HTMLAnchorElement>('.product-image')!;
    expect(detail.getAttribute('href')).toContain('/productos/tarjetas-personales');
    expect(decodeURIComponent(detail.getAttribute('href')!)).toContain('subcategory=subcategoria-10');
    const input=el.querySelector<HTMLInputElement>('#header-product-search')!;
    input.value='banner';input.dispatchEvent(new Event('input'));TestBed.tick();
    await new Promise(resolve=>setTimeout(resolve,320));await h.fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain('subcategory=subcategoria-10');
    expect(TestBed.inject(Router).url).toContain('buscar=banner');
    expect(list).toHaveBeenCalledTimes(2);expect(commercialCategories).toHaveBeenCalledOnce();
    el.querySelector<HTMLAnchorElement>('.desktop-nav .category-link')!.click();await h.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/productos?commercialCategory=comercial&buscar=banner');
    expect(list).toHaveBeenCalledTimes(3);
    el.querySelectorAll<HTMLAnchorElement>('.desktop-nav .subcategory-dropdown a')[1].click();await h.fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain('subcategory=subcategoria-11');
    expect(list).toHaveBeenCalledTimes(4);
    el.querySelector<HTMLAnchorElement>('.desktop-nav .all')!.click();await h.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/productos');
    expect(el.querySelectorAll('.catalog-card').length).toBeGreaterThan(1);
  });
  it('category and subcategory links use commercial filters without leaking the historical category',async()=>{
    setup();const f=TestBed.createComponent(Header);await f.whenStable();
    f.componentInstance.search.setValue('texto');await new Promise(resolve=>setTimeout(resolve,300));await f.whenStable();
    const category:HTMLAnchorElement=f.nativeElement.querySelector('.category-link');
    expect(category.getAttribute('href')).toBe('/productos?commercialCategory=comercial&buscar=texto');
    const child:HTMLAnchorElement=f.nativeElement.querySelector('.subcategory-dropdown a');
    expect(child.getAttribute('href')).toBe('/productos?commercialCategory=comercial&subcategory=subcategoria-10&buscar=texto');
  });
  it('reports commercial errors without fallback, then retries an empty tree using public categories',async()=>{
    const {commercialCategories,categories}=setup();
    const pending=new Subject<readonly CommercialCategory[]>();commercialCategories.mockReturnValueOnce(pending);
    const f=TestBed.createComponent(Header);await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Cargando categorías');
    pending.error(new Error('offline'));await f.whenStable();
    expect(f.nativeElement.querySelector('[role=alert]')).not.toBeNull();
    expect(categories).not.toHaveBeenCalled();
    commercialCategories.mockReturnValueOnce(of([]));
    f.nativeElement.querySelector('.navigation-status button').click();await f.whenStable();
    expect(categories).toHaveBeenCalledOnce();
    expect(f.nativeElement.querySelectorAll('.category-menu').length).toBeGreaterThan(0);
    expect(f.nativeElement.querySelector('.subcategory-dropdown')).toBeNull();
    expect(f.nativeElement.querySelector('.desktop-nav .all').getAttribute('href')).toBe('/productos');
  });
  it('uses historical category routes on desktop and mobile when the commercial tree is empty',async()=>{
    const {commercialCategories,categories,list}=setup();commercialCategories.mockReturnValue(of([]));
    const f=TestBed.createComponent(Header);await f.whenStable();
    const publicCategories=provideTestCatalog().useValue.categories();
    publicCategories.subscribe(items=>{
      expect(f.nativeElement.querySelectorAll('.category-menu')).toHaveLength(items.length);
      expect(f.nativeElement.querySelectorAll('.mobile-category')).toHaveLength(items.length);
      const expected='/productos/'+items[0].slug;
      expect(f.nativeElement.querySelector('.category-link').getAttribute('href')).toBe(expected);
      expect(f.nativeElement.querySelector('.mobile-category a').getAttribute('href')).toBe(expected);
    });
    expect(f.nativeElement.querySelector('.subcategory-toggle')).toBeNull();
    expect(f.componentInstance.categoryState().error).toBe(false);
    expect(list).not.toHaveBeenCalled();expect(categories).toHaveBeenCalledOnce();
    f.nativeElement.querySelector('.category-link').click();await f.whenStable();
    expect(TestBed.inject(Router).url).toMatch(/^\/productos\/[^?]+$/);
  });
  it('keeps nonempty commercial navigation without fetching historical categories',async()=>{
    const {categories}=setup();const f=TestBed.createComponent(Header);await f.whenStable();
    expect(categories).not.toHaveBeenCalled();
    expect(f.nativeElement.querySelector('.category-link').getAttribute('href')).toBe('/productos?commercialCategory=comercial');
  });
  it('filters existing products through a fallback category without commercial parameters',async()=>{
    const {commercialCategories,list}=setup();commercialCategories.mockReturnValue(of([]));
    const h=await RouterTestingHarness.create('/productos');await h.fixture.whenStable();
    list.mockClear();
    const link=h.routeNativeElement!.querySelector<HTMLAnchorElement>('.category-link')!;
    const slug=link.getAttribute('href')!.split('/').at(-1)!;
    link.click();await h.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/productos/'+slug);
    expect(list).toHaveBeenCalledWith({category:slug,search:''},{fresh:false});
    expect(h.routeNativeElement!.querySelectorAll('.catalog-card').length).toBeGreaterThan(0);
  });
  it('handles empty public categories and fallback failures without inventing categories',async()=>{
    const {commercialCategories,categories}=setup();commercialCategories.mockReturnValue(of([]));
    categories.mockReturnValueOnce(of([]));const f=TestBed.createComponent(Header);await f.whenStable();
    expect(f.nativeElement.querySelector('.category-menu')).toBeNull();
    expect(f.componentInstance.categoryState().error).toBe(false);
    categories.mockReturnValueOnce(throwError(()=>new Error('offline')));
    f.componentInstance.retryCategories();await f.whenStable();
    expect(f.componentInstance.categoryState().error).toBe(true);
    expect(f.nativeElement.querySelector('.desktop-nav .all').getAttribute('href')).toBe('/productos');
  });
});
