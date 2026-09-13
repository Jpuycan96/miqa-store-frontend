import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { routes } from '../../app.routes';
import { QUOTE_STORAGE_KEY } from '../../core/quote/quote-store';
import { ProductDto } from '../../core/data/catalog-mapper';

const base = 'http://127.0.0.1:8081/api/public';
const product: ProductDto = {
  id: 'api-only', slug: 'api-only', name: 'API only product', shortDescription: '', description: '',
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
  afterEach(() => { http.verify(); localStorage.removeItem(QUOTE_STORAGE_KEY); });
  it('renders loading, API errors, retry, API-only data and empty states', async () => {
    const h = await RouterTestingHarness.create('/productos');
    const el = h.routeNativeElement!;
    expect(el.textContent).toContain('Cargando productos');
    expect(el.querySelectorAll('.catalog-card')).toHaveLength(0);
    http.expectOne(base + '/categories').flush([product.category]);
    http.expectOne(base + '/products').flush({}, { status: 503, statusText: 'Unavailable' });
    await h.fixture.whenStable();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('No pudimos cargar');
    el.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    http.expectOne(base + '/products').flush([product]);
    await h.fixture.whenStable();
    expect(el.querySelectorAll('.catalog-card')).toHaveLength(1);
    expect(el.querySelector('.catalog-card')?.textContent).toContain('API only product');
    const search = el.querySelector<HTMLInputElement>('#product-search')!;
    search.value = 'first'; search.dispatchEvent(new Event('input')); TestBed.tick();
    await new Promise(resolve => setTimeout(resolve, 150));
    http.expectNone(r => r.params.has('search'));
    search.value = 'latest'; search.dispatchEvent(new Event('input')); TestBed.tick();
    await new Promise(resolve => setTimeout(resolve, 320));
    const stale = http.expectOne(r => r.params.get('search') === 'latest');
    search.value = 'empty'; search.dispatchEvent(new Event('input')); TestBed.tick();
    await new Promise(resolve => setTimeout(resolve, 320));
    expect(stale.cancelled).toBe(true);
    http.expectOne(r => r.params.get('search') === 'empty').flush([]);
    await h.fixture.whenStable();
    expect(el.querySelector('.empty')).toBeTruthy();
  });
  it('keeps an unknown slug in place and allows retry after a detail failure', async () => {
    const h = await RouterTestingHarness.create('/productos/missing');
    expect(h.routeNativeElement!.textContent).toContain('Cargando producto');
    http.expectOne(base + '/categories').flush([]);
    http.expectOne(base + '/products/missing').flush({}, { status: 404, statusText: 'Not Found' });
    await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelector('h1')?.textContent).toContain('no está disponible');
    await h.navigateByUrl('/productos/api-only');
    http.expectOne(base + '/products/api-only').flush({}, { status: 500, statusText: 'Error' });
    await h.fixture.whenStable();
    h.routeNativeElement!.querySelector<HTMLButtonElement>('.unavailable button')!.click();
    http.expectOne(base + '/products/api-only').flush(product);
    await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelector('h1')?.textContent).toBe(product.name);
    expect(document.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex,follow');
  });
});
