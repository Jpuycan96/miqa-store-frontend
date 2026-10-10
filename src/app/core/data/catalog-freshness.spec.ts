import { ApplicationRef, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogApiService } from './catalog-api.service';
import { ProductDto } from './catalog-mapper';
import { environment } from '../../../environments/environment';

const base = `${environment.storeApiBaseUrl}/api/public`;
const product: ProductDto = {
  id: 'old', slug: 'old', name: 'Anterior', description: '', shortDescription: '',
  category: { slug: 'categoria', name: 'Categoría' }, image: null,
  published: true, featured: false, saleType: 'QUANTITY', unitLabel: 'unidad'
};

describe('Catalog freshness after hydration', () => {
  let api: CatalogApiService;
  let http: HttpTestingController;
  let stabilize: () => void;
  let stable: Promise<void>;
  function setup(snapshot = true, platform = 'browser') {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: PLATFORM_ID, useValue: platform }] });
    if (snapshot) TestBed.inject(TransferState).set(makeStateKey<boolean>('test-prerender-state'), true);
    stable = new Promise<void>(resolve => { stabilize = resolve; });
    vi.spyOn(TestBed.inject(ApplicationRef), 'whenStable').mockReturnValue(stable);
    api = TestBed.inject(CatalogApiService);
    http = TestBed.inject(HttpTestingController);
  }
  async function hydrate() { stabilize(); await stable; await Promise.resolve(); }
  afterEach(() => {
    try { http.verify(); } finally { TestBed.resetTestingModule(); vi.restoreAllMocks(); }
  });

  it('replaces the snapshot with newly published API products and removes disabled ones', async () => {
    setup(); const versions: string[][] = []; let complete = false;
    api.list().subscribe({ next: products => versions.push(products.map(product => product.name)),
      complete: () => { complete = true; } });
    const initial = http.expectOne(base + '/products');
    expect(initial.request.transferCache).not.toBe(false);
    initial.flush([product]);
    expect(versions).toEqual([['Anterior']]);
    http.expectNone(base + '/products'); await hydrate();
    const fresh = http.expectOne(base + '/products');
    expect(fresh.request.transferCache).toBe(false);
    expect(fresh.request.cache).toBe('no-store');
    fresh.flush([{ ...product, id: 'new', slug: 'new', name: 'Nuevo publicado' },
      { ...product, published: false }]);
    expect(versions).toEqual([['Anterior'], ['Nuevo publicado']]);
    expect(complete).toBe(true); // No ongoing subscription or polling.
  });

  it('makes only one fresh request on a client page without transferred state', async () => {
    setup(false); api.list().subscribe();
    const request = http.expectOne(base + '/products');
    expect(request.request.transferCache).toBe(false);
    expect(request.request.cache).toBe('no-store');
    request.flush([]); await hydrate(); http.expectNone(base + '/products');
  });

  it('resubscribes categories from the API instead of retaining previous navigation data', async () => {
    setup(false); await hydrate();
    const categories = api.categories(); const names: string[] = [];
    categories.subscribe(result => names.push(result[0].name));
    http.expectOne(base + '/categories').flush([{ slug: 'c', name: 'Antes' }]);
    categories.subscribe(result => names.push(result[0].name));
    http.expectOne(base + '/categories').flush([{ slug: 'c', name: 'Actualizada' }]);
    expect(names).toEqual(['Antes', 'Actualizada']);
  });

  it('recognizes fresh categories before hydration without consulting the old snapshot', async () => {
    setup();
    api.categories({ fresh: true }).subscribe(result => expect(result[0].slug).toBe('nueva-categoria'));
    const request = http.expectOne(base + '/categories');
    expect(request.request.transferCache).toBe(false);
    expect(request.request.cache).toBe('no-store');
    request.flush([{ slug: 'nueva-categoria', name: 'Nueva' }]);
    await hydrate(); http.expectNone(base + '/categories');
  });

  it('replaces a prerendered detail with unavailable when the live API returns 404', async () => {
    setup(); const ids: (string | undefined)[] = [];
    api.findBySlug(product.slug).subscribe(product => ids.push(product?.id));
    http.expectOne(base + '/products/old').flush(product); await hydrate();
    http.expectOne(base + '/products/old').flush({}, { status: 404, statusText: 'Not Found' });
    expect(ids).toEqual(['old', undefined]);
  });

  it('propagates revalidation errors so the page can report them', async () => {
    setup(); let failed = false;
    api.list().subscribe({ error: () => { failed = true; } });
    http.expectOne(base + '/products').flush([product]); await hydrate();
    http.expectOne(base + '/products').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(failed).toBe(true);
  });

  it('cancels pending revalidation when the page is destroyed', async () => {
    setup(); const subscription = api.list().subscribe();
    http.expectOne(base + '/products').flush([product]);
    subscription.unsubscribe(); await hydrate(); http.expectNone(base + '/products');
  });

  it('keeps server prerender a single request without waiting for browser stabilization', () => {
    setup(true, 'server'); api.list().subscribe(products => expect(products).toHaveLength(1));
    const request = http.expectOne(base + '/products');
    expect(request.request.transferCache).not.toBe(false);
    expect(request.request.cache).toBeUndefined(); request.flush([product]);
    expect(TestBed.inject(ApplicationRef).whenStable).not.toHaveBeenCalled();
  });
});
