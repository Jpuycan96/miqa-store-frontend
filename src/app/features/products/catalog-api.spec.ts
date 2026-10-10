import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { routes } from '../../app.routes';
import { QUOTE_STORAGE_KEY } from '../../core/quote/quote-store';
import { ProductDto } from '../../core/data/catalog-mapper';
import { mapProduct } from '../../core/data/catalog-mapper';
import { QuoteStore } from '../../core/quote/quote-store';
import { environment } from '../../../environments/environment';

const base = `${environment.storeApiBaseUrl}/api/public`;
const product: ProductDto = {
  id: 'api-only', slug: 'api-only', name: 'API only product', shortDescription: '', description: '',
  seoTitle: 'Producto SEO', seoDescription: 'Descripción SEO del producto.',
  category: { slug: 'imprenta-papeleria', name: 'Imprenta' }, image: '/images/products/volantes.png',
  published: true, featured: false, saleType: 'QUANTITY', unitLabel: 'unidad'
};
describe('Catalog HTTP integration without backend', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    localStorage.removeItem(QUOTE_STORAGE_KEY);
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    try { http.verify(); } finally { TestBed.resetTestingModule(); localStorage.removeItem(QUOTE_STORAGE_KEY); }
  });
  it('renders loading, API errors, retry, API-only data and empty states', async () => {
    const h = await RouterTestingHarness.create('/productos');
    const el = h.routeNativeElement!;
    expect(el.textContent).toContain('Cargando productos');
    expect(el.querySelectorAll('.catalog-card')).toHaveLength(0);
    const categories=http.match(base + '/categories');expect(categories).toHaveLength(2);
    categories.forEach(request=>request.flush([product.category]));
    http.expectOne(base + '/products').flush({}, { status: 503, statusText: 'Unavailable' });
    await h.fixture.whenStable();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('No pudimos cargar');
    el.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    http.expectOne(base + '/categories').flush([product.category]);
    http.expectOne(base + '/products').flush([product]);
    await h.fixture.whenStable();
    expect(el.querySelectorAll('.catalog-card')).toHaveLength(1);
    expect(el.querySelector('.catalog-card')?.textContent).toContain('API only product');
    const search = el.querySelector<HTMLInputElement>('#header-product-search')!;
    search.value = 'first'; search.dispatchEvent(new Event('input')); TestBed.tick();
    await new Promise(resolve => setTimeout(resolve, 150));
    http.expectNone(r => r.params.has('search'));
    search.value = 'latest'; search.dispatchEvent(new Event('input')); TestBed.tick();
    await new Promise(resolve => setTimeout(resolve, 650));
    const stale = http.expectOne(r => r.params.get('search') === 'latest');
    search.value = 'empty'; search.dispatchEvent(new Event('input')); TestBed.tick();
    await new Promise(resolve => setTimeout(resolve, 650));
    expect(stale.cancelled).toBe(true);
    http.expectOne(r => r.params.get('search') === 'empty').flush([]);
    http.match(base + '/categories').forEach(request => { if (!request.cancelled) request.flush([product.category]); });
    await h.fixture.whenStable();
    expect(el.querySelector('.empty')).toBeTruthy();
  });
  it('keeps an unknown slug in place and allows retry after a detail failure', async () => {
    const creating = RouterTestingHarness.create('/productos/missing');
    await new Promise(resolve=>setTimeout(resolve,0));
    http.expectOne(base + '/categories').flush([]);
    const h = await creating;
    expect(h.routeNativeElement!.textContent).toContain('Cargando producto');
    http.match(base + '/categories').forEach(request=>request.flush([]));
    http.expectOne(base + '/products/missing').flush({}, { status: 404, statusText: 'Not Found' });
    await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelector('h1')?.textContent).toContain('no está disponible');
    const navigating=h.navigateByUrl('/productos/api-only');await new Promise(resolve=>setTimeout(resolve,0));http.expectOne(base+'/categories').flush([]);await navigating;
    http.expectOne(base + '/products/api-only').flush({}, { status: 500, statusText: 'Error' });
    await h.fixture.whenStable();
    h.routeNativeElement!.querySelector<HTMLButtonElement>('.unavailable button')!.click();
    http.match(base + '/categories').forEach(request => { if (!request.cancelled) request.flush([]); });
    http.expectOne(base + '/products/api-only').flush(product);
    await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelector('h1')?.textContent).toBe(product.name);
    expect(document.title).toBe('Producto SEO');expect(document.querySelector('meta[name=description]')?.getAttribute('content')).toBe('Descripción SEO del producto.');
    expect(document.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('index,follow');expect(document.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('product');
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://store.solucionesmicaela.com/images/products/volantes.png');
    const schema=JSON.parse(document.querySelector('script[data-miqa-seo-jsonld]')?.textContent||'{}');expect(schema['@type']).toBe('BreadcrumbList');expect(JSON.stringify(schema)).not.toContain('"@type":"Product"');
    expect(document.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe('https://store.solucionesmicaela.com/productos/api-only');expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe('Producto SEO');
  });
  it('uses non-empty product SEO fields and falls back for blank strings',async()=>{
    const creating=RouterTestingHarness.create('/productos/api-only');await new Promise(resolve=>setTimeout(resolve,0));http.expectOne(base+'/categories').flush([]);const h=await creating;http.match(base+'/categories').forEach(request=>request.flush([]));http.expectOne(base+'/products/api-only').flush({...product,seoTitle:'   ',seoDescription:' ',shortDescription:'Descripción corta'});await h.fixture.whenStable();
    expect(document.title).toBe('API only product | MIQA');expect(document.querySelector('meta[name=description]')?.getAttribute('content')).toBe('Descripción corta');expect(document.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe('https://store.solucionesmicaela.com/productos/api-only');
  });

  it('loads new publications and removes disabled products on return without clearing the quote', async () => {
    const h = await RouterTestingHarness.create('/productos');
    const flushCategories = () => http.match(base + '/categories').forEach(request => {
      if (!request.cancelled) request.flush([product.category]);
    });
    flushCategories(); http.expectOne(base + '/products').flush([product]); await h.fixture.whenStable();
    const quote = TestBed.inject(QuoteStore);
    expect(quote.addItem(mapProduct(product), { quantity: 3, notes: 'Conservar mi pedido' })).toBe(true);
    await h.fixture.whenStable(); const lines = structuredClone(quote.items());
    const opening = h.navigateByUrl('/productos/api-only');
    await new Promise(resolve => setTimeout(resolve, 0)); flushCategories(); await opening;
    flushCategories(); http.expectOne(base + '/products/api-only').flush({ ...product, name: 'Ficha actualizada', seoTitle: 'SEO actual' });
    await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelector('h1')?.textContent).toBe('Ficha actualizada');
    expect(document.title).toBe('SEO actual');
    expect(quote.items()).toEqual(lines);

    await h.navigateByUrl('/productos'); flushCategories();
    const newProduct = { ...product, id: 'published-after-build', slug: 'published-after-build', name: 'Nuevo publicado' };
    http.expectOne(base + '/products').flush([newProduct]); await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelectorAll('.catalog-card')).toHaveLength(1);
    expect(h.routeNativeElement!.querySelector('.catalog-card')?.textContent).toContain('Nuevo publicado');
    expect(h.routeNativeElement!.querySelector('.product-grid')?.textContent).not.toContain('API only product');
    expect(quote.items()).toEqual(lines);
    const newDetail = h.navigateByUrl('/productos/published-after-build');
    await new Promise(resolve => setTimeout(resolve, 0)); flushCategories(); await newDetail;
    flushCategories(); http.expectOne(base + '/products/published-after-build').flush(newProduct);
    await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelector('h1')?.textContent).toBe('Nuevo publicado');
    expect(quote.items()).toEqual(lines);
  });

  it('recognizes a category added after build and refreshes a reused category page and header', async () => {
    let category = { slug: 'categoria-nueva', name: 'Nueva', catalogHeadline: 'Título inicial', catalogDescription: 'Texto inicial' };
    const creating = RouterTestingHarness.create('/productos/categoria-nueva');
    await new Promise(resolve => setTimeout(resolve, 0));
    const guard = http.expectOne(base + '/categories');
    expect(guard.request.transferCache).toBe(false); guard.flush([category]);
    const h = await creating;
    const flushCategories = () => http.match(base + '/categories').forEach(request => {
      if (!request.cancelled) request.flush([category]);
    });
    flushCategories(); http.expectOne(request => request.url === base + '/products').flush([{ ...product, category }]);
    await h.fixture.whenStable(); expect(h.routeNativeElement!.querySelector('h1')?.textContent).toBe('Título inicial');
    category = { slug: 'otra-nueva', name: 'Nombre actual', catalogHeadline: 'Título actual', catalogDescription: 'Texto actual' };
    const navigating = h.navigateByUrl('/productos/otra-nueva');
    await new Promise(resolve => setTimeout(resolve, 0)); flushCategories(); await navigating;
    flushCategories(); http.expectOne(request => request.url === base + '/products').flush([{ ...product, category }]);
    await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelector('h1')?.textContent).toBe('Título actual');
    expect(h.routeNativeElement!.querySelector('.intro')?.textContent).toBe('Texto actual');
    expect(h.routeNativeElement!.querySelector('.desktop-nav')?.textContent).toContain('Nombre actual');
    expect(document.title).toContain('Nombre actual');
    category = { ...category, name: 'Nombre posfiltro', catalogHeadline: 'Título actualizado con filtros' };
    const searching = h.navigateByUrl('/productos/otra-nueva?buscar=producto');
    await new Promise(resolve => setTimeout(resolve, 0)); flushCategories(); await searching;
    flushCategories(); await new Promise(resolve => setTimeout(resolve, 350));
    http.expectOne(request => request.params.get('search') === 'producto').flush([{ ...product, category }]);
    await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelector('h1')?.textContent).toBe('Título actualizado con filtros');
    expect(h.routeNativeElement!.querySelector('.desktop-nav')?.textContent).toContain('Nombre posfiltro');
    expect(document.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex,follow');
  });
});
