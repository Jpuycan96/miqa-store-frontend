import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogApiService } from './catalog-api.service';
import { ProductCatalog } from './product-catalog';
import { ProductDto, mapProduct, resolveProductImage } from './catalog-mapper';

@Component({ template: '' })
class RenderHost {}
export const API_PRODUCT: ProductDto = {
  id: 987, slug: 'producto-api', name: 'Producto desde API', shortDescription: 'Descripción',
  description: 'Detalle del servidor', category: { slug: 'imprenta-papeleria', name: 'Imprenta' },
  image: '/images/products/volantes.png', gallery: null, featured: true, published: true,
  saleType: 'PACK', unitLabel: 'unidad', packSize: 1000, packLabel: 'millar',
  minQuantity: null, step: null, materials: null, extras: null
};
const base = 'https://api-store.solucionesmicaela.com/api/public';
describe('Catalog API', () => {
  let api: CatalogApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(CatalogApiService);
    http = TestBed.inject(HttpTestingController);
    TestBed.createComponent(RenderHost).detectChanges();
    TestBed.tick();
  });
  afterEach(() => http.verify());
  it('provides the HTTP implementation and preserves category order', () => {
    expect(TestBed.inject(ProductCatalog)).toBe(api);
    const categories = [{ slug: 'z', name: 'First', displayOrder: 0 }, { slug: 'a', name: 'Second', displayOrder: 1 }];
    api.categories().subscribe(result => expect(result.map(c => c.slug)).toEqual(['z', 'a']));
    http.expectOne(base + '/categories').flush(categories);
  });
  it('gets and maps products including nullable fields', () => {
    api.list().subscribe(products => {
      expect(products).toHaveLength(1);
      expect(products[0]).toMatchObject({ id: '987', name: API_PRODUCT.name, materials: [], extras: [], gallery: [] });
      expect(products[0].minQuantity).toBeUndefined();
    });
    http.expectOne(base + '/products').flush([API_PRODUCT]);
  });
  it.each([true, false])('sends combined category/search/featured=%s params', featured => {
    api.list({ category: 'imprenta-papeleria', search: ' tarjetas ', featured }).subscribe();
    const request = http.expectOne(r => r.url === base + '/products');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('category')).toBe('imprenta-papeleria');
    expect(request.request.params.get('search')).toBe('tarjetas');
    expect(request.request.params.get('featured')).toBe(String(featured));
    request.flush([]);
  });
  it('gets a detail by slug and treats only 404 as unavailable', () => {
    api.findBySlug('producto-api').subscribe(result => expect(result?.id).toBe('987'));
    http.expectOne(base + '/products/producto-api').flush(API_PRODUCT);
    api.findBySlug('missing').subscribe(result => expect(result).toBeUndefined());
    http.expectOne(base + '/products/missing').flush({}, { status: 404, statusText: 'Not Found' });
    let error = false;
    api.findBySlug('broken').subscribe({ error: () => { error = true; } });
    http.expectOne(base + '/products/broken').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(error).toBe(true);
  });
  it('keeps absolute VPS images and supports configurable relative media', () => {
    expect(resolveProductImage('https://media.example.com/p.png', 'https://api.example.com/media')).toBe('https://media.example.com/p.png');
    expect(resolveProductImage('/p.png', 'https://api.example.com/media/')).toBe('https://api.example.com/media/p.png');
    expect(mapProduct(API_PRODUCT).image).toBe(API_PRODUCT.image);
    expect(resolveProductImage(null)).toBe('');
    expect(resolveProductImage('javascript:alert(1)')).toBe('');
  });
});
