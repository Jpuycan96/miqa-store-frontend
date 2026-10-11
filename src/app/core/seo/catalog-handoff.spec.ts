import { ApplicationRef, DOCUMENT, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { ProductCatalog } from '../data/product-catalog';
import { PRODUCTS, PRODUCT_CATEGORIES } from '../data/products.mock';
import { Product, ProductCategory } from '../../shared/models/product';
import { ProductDetail } from '../../features/products/detail/product-detail';
import { Catalog } from '../../features/products/catalog/catalog';
import { CatalogHandoff } from './catalog-handoff';

const product = PRODUCTS[0];
const category = PRODUCT_CATEGORIES.find(item => item.slug === product.categorySlug)!;
const origin = 'https://store.solucionesmicaela.com';

describe('Worker to Angular catalog handoff', () => {
  let initial: HTMLElement;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let url: string;
  function setup(slug = product.slug, categoryRoute = false) {
    url = `/productos/${slug}`;
    history.replaceState(null, '', url);
    initial = document.createElement('main');
    initial.id = 'miqa-catalog-seo'; initial.setAttribute('data-miqa-catalog-seo', '');
    initial.setAttribute('data-miqa-canonical', origin + url);
    initial.textContent = 'Contenido inicial del Worker'; document.body.prepend(initial);
    document.title = 'Título del Worker';
    const description = document.createElement('meta'); description.name = 'description'; description.content = 'Descripción del Worker';
    document.head.querySelectorAll('meta[name="description"],link[rel="canonical"],script[data-miqa-seo-jsonld]').forEach(node => node.remove());
    document.head.append(description);
    const canonical = document.createElement('link'); canonical.rel = 'canonical'; canonical.href = origin + url; document.head.append(canonical);
    const structured = document.createElement('script'); structured.type = 'application/ld+json'; structured.setAttribute('data-miqa-seo-jsonld', ''); structured.textContent = '{}'; document.head.append(structured);
    params = new BehaviorSubject(convertToParamMap({ slug }));
    const query = new BehaviorSubject(convertToParamMap({}));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: ActivatedRoute, useValue: {
      paramMap: params, queryParamMap: query, data: of({ categoryRoute }),
      snapshot: { paramMap: params.value, queryParamMap: query.value, data: { categoryRoute } }
    } }] });
  }
  function source(products = new Subject<Product | undefined>(), categories: Observable<readonly ProductCategory[]> = of([category]), list = new Subject<readonly Product[]>()) {
    const mock = { findBySlug: vi.fn(() => products), categories: vi.fn(() => categories), list: vi.fn(() => list) };
    TestBed.configureTestingModule({ providers: [{ provide: ProductCatalog, useValue: mock }] });
    vi.spyOn(TestBed.inject(Router), 'url', 'get').mockImplementation(() => url);
    return { products, list, mock };
  }
  function render<T>(fixture: import('@angular/core/testing').ComponentFixture<T>) {
    fixture.detectChanges(); TestBed.tick();
  }
  afterEach(() => {
    TestBed.resetTestingModule(); vi.restoreAllMocks();
    document.getElementById('miqa-catalog-seo')?.remove();
    document.querySelectorAll('meta[name="description"],link[rel="canonical"],script[data-miqa-seo-jsonld]').forEach(node => node.remove());
    history.replaceState(null, '', '/');
  });

  it('keeps HTML and Worker metadata during startup, even when Angular is stable', async () => {
    setup(); source(); const fixture = TestBed.createComponent(ProductDetail); render(fixture);
    await TestBed.inject(ApplicationRef).whenStable(); render(fixture);
    expect(initial.isConnected).toBe(true); expect(document.title).toBe('Título del Worker');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Descripción del Worker');
    expect(fixture.nativeElement.textContent).toContain('Cargando producto');
  });

  it('replaces a confirmed product after rendering, with unique current metadata', () => {
    setup(); const data = source(); const fixture = TestBed.createComponent(ProductDetail); render(fixture);
    expect(data.mock.findBySlug).toHaveBeenCalledWith(product.slug, { fresh: true });
    data.products.next({ ...product, seoTitle: 'Actual personalizado', seoDescription: 'Descripción actual' });
    expect(initial.isConnected).toBe(true); // A data emission alone does not remove HTML.
    render(fixture);
    expect(fixture.nativeElement.querySelector('#product-title').textContent).toBe(product.name);
    expect(initial.isConnected).toBe(false); expect(document.title).toBe('Actual personalizado');
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
  });

  it('keeps an explicitly temporary fallback on network failure and recovers on retry', () => {
    setup(); const data = source(); const fixture = TestBed.createComponent(ProductDetail); render(fixture);
    data.products.error(new Error('offline')); render(fixture);
    expect(initial.isConnected).toBe(true); expect(initial.querySelector('[role="status"]')?.textContent).toContain('Información temporal');
    expect(document.title).toBe('Título del Worker');
    const retry = new Subject<Product | undefined>(); data.mock.findBySlug.mockReturnValue(retry);
    fixture.componentInstance.retry(); retry.next(product); render(fixture);
    expect(initial.isConnected).toBe(false);
  });

  it('removes an obsolete product when the current public API returns unavailable', () => {
    setup(); const data = source(); const fixture = TestBed.createComponent(ProductDetail); render(fixture);
    data.products.next(undefined); render(fixture);
    expect(initial.isConnected).toBe(false); expect(fixture.nativeElement.textContent).toContain('no está disponible');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,follow');
    expect(document.querySelector('script[data-miqa-seo-jsonld]')).toBeNull();
  });

  it('waits for successful category precedence before accepting a product or 404', () => {
    setup(); const categories = new Subject<readonly ProductCategory[]>(); const data = source(undefined, categories);
    const fixture = TestBed.createComponent(ProductDetail); render(fixture); data.products.next(undefined); render(fixture);
    expect(initial.isConnected).toBe(true); expect(document.title).toBe('Título del Worker');
    categories.error(new Error('category resolution offline')); render(fixture);
    expect(initial.isConnected).toBe(true); expect(initial.textContent).toContain('Información temporal');
  });

  it('never confirms a product-route 404 if a public category owns that slug', () => {
    setup(category.slug); const data = source(); const fixture = TestBed.createComponent(ProductDetail); render(fixture);
    data.products.next(undefined); render(fixture);
    expect(initial.isConnected).toBe(true); expect(document.title).toBe('Título del Worker');
    expect(initial.textContent).toContain('Información temporal');
  });

  it('replaces a public category only after both categories and products have rendered', () => {
    setup(category.slug, true); const data = source(); const fixture = TestBed.createComponent(Catalog); render(fixture);
    expect(initial.isConnected).toBe(true); data.list.next([product]); render(fixture);
    expect(initial.isConnected).toBe(false); expect(fixture.nativeElement.querySelectorAll('.catalog-card')).toHaveLength(1);
    expect(document.title).toBe(`${category.name} en Trujillo | MIQA`);
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelectorAll('script[data-miqa-seo-jsonld]')).toHaveLength(1);
    expect(data.mock.list).toHaveBeenCalledWith({ category: category.slug, search: '' }, { fresh: true });
  });

  it('does not leave an obsolete category when it disappears from the public API', () => {
    setup(category.slug, true); const data = source(undefined, of([])); const fixture = TestBed.createComponent(Catalog); render(fixture);
    data.list.next([]); render(fixture);
    expect(initial.isConnected).toBe(false); expect(fixture.nativeElement.textContent).toContain('Esta categoría no está disponible');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(origin + url);
    expect(document.querySelector('script[data-miqa-seo-jsonld]')).toBeNull();
  });

  it('keeps a category fallback and metadata on a products API error', () => {
    setup(category.slug, true); const data = source(); const fixture = TestBed.createComponent(Catalog); render(fixture);
    data.list.error(new Error('offline')); render(fixture);
    expect(initial.isConnected).toBe(true); expect(initial.textContent).toContain('Información temporal');
    expect(document.title).toBe('Título del Worker');
  });

  it('removes a definitively withdrawn category even if its products request fails', () => {
    setup(category.slug, true); const data = source(undefined, of([]));
    const fixture = TestBed.createComponent(Catalog); render(fixture);
    expect(initial.isConnected).toBe(false);
    data.list.error(new Error('products offline')); render(fixture);
    expect(fixture.nativeElement.textContent).toContain('Esta categoría no está disponible');
    expect(document.title).toBe('Categoría no disponible | MIQA');
    expect(document.querySelector('script[data-miqa-seo-jsonld]')).toBeNull();
  });

  it('ignores pending data from an earlier product when navigating', () => {
    setup(); const first = new Subject<Product | undefined>(); const second = new Subject<Product | undefined>();
    const data = source(first); data.mock.findBySlug.mockReturnValueOnce(first).mockReturnValue(second);
    const fixture = TestBed.createComponent(ProductDetail); render(fixture);
    const next = { ...product, slug: 'otro-producto', name: 'Otro' }; url = '/productos/otro-producto';
    params.next(convertToParamMap({ slug: next.slug })); first.next(product); render(fixture);
    expect(initial.isConnected).toBe(true); second.next(next); render(fixture);
    expect(initial.isConnected).toBe(false); expect(fixture.nativeElement.querySelector('#product-title').textContent).toBe('Otro');
  });

  it('leaves prerender and normal CSR untouched when there is no Worker block', () => {
    setup(); initial.remove(); const data = source(); const fixture = TestBed.createComponent(ProductDetail);
    data.products.next(product); render(fixture);
    expect(TestBed.inject(CatalogHandoff).visible()).toBe(false);
    expect(data.mock.findBySlug).toHaveBeenCalledWith(product.slug, { fresh: false });
    expect(fixture.nativeElement.querySelector('#product-title').textContent).toBe(product.name);
  });

  it('never removes a same-named node inside the Angular root', () => {
    setup(); const root = document.createElement('app-root'); document.body.append(root); root.append(initial);
    expect(TestBed.inject(CatalogHandoff).visible()).toBe(false);
    TestBed.inject(CatalogHandoff).complete(url); expect(initial.isConnected).toBe(true); root.remove();
  });

  it('does not touch server prerender DOM', () => {
    setup(); TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    expect(TestBed.inject(CatalogHandoff).visible()).toBe(false); expect(initial.isConnected).toBe(true);
    expect(TestBed.inject(DOCUMENT)).toBe(document);
  });

  it('rejects an external canonical marker without touching its nodes', () => {
    setup(); initial.setAttribute('data-miqa-canonical', 'https://external.example' + url);
    expect(TestBed.inject(CatalogHandoff).visible()).toBe(false);
    TestBed.inject(CatalogHandoff).complete(url); expect(initial.isConnected).toBe(true);
  });

  it('does not move focus from another application control', () => {
    setup(); const data = source(); const button = document.createElement('button'); document.body.append(button); button.focus();
    const fixture = TestBed.createComponent(ProductDetail); render(fixture); data.products.next(product); render(fixture);
    expect(initial.isConnected).toBe(false); expect(document.activeElement).toBe(button); button.remove();
  });

  it('retries category route recognition when category precedence contradicts a product 404', () => {
    setup(category.slug); const data = source(); const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(false);
    const fixture = TestBed.createComponent(ProductDetail); render(fixture); data.products.next(undefined); render(fixture);
    fixture.componentInstance.retry();
    expect(navigate).toHaveBeenCalledWith(url, { onSameUrlNavigation: 'reload', replaceUrl: true });
    expect(initial.isConnected).toBe(true);
  });
});
