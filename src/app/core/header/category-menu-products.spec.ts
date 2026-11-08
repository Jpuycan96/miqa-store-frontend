import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ProductCatalog } from '../data/product-catalog';
import { PRODUCTS } from '../data/products.mock';
import { Product, ProductCategory } from '../../shared/models/product';
import { CategoryMenuProducts, MenuProductGroup } from './category-menu-products';

const category: ProductCategory = {
  name: 'Comercial', slug: 'commercial-api',
  subcategories: Array.from({ length: 8 }, (_, i) => ({
    erpCategoryId: '9', erpSubcategoryId: String(i), slug: 'real-slug-' + i,
    name: 'Sub ' + i, displayOrder: i
  }))
};

describe('Commercial mega menu product groups', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup() {
    const list = vi.fn((_filters: unknown, _options: unknown) => of<readonly Product[]>([]));
    TestBed.configureTestingModule({ providers: [CategoryMenuProducts, { provide: ProductCatalog, useValue: { list } }] });
    return { list, service: TestBed.inject(CategoryMenuProducts) };
  }
  it('uses both commercial filters, preserves additional membership and public order, deduplicates and limits to six', () => {
    const { list, service } = setup();
    const product = { ...PRODUCTS[0], categorySlug: 'different-primary', published: true };
    const products = Array.from({ length: 9 }, (_, i) => ({ ...product, id: String(i), slug: 'p-' + i }));
    list.mockReturnValue(of([{ ...product, id: 'hidden', published: false }, products[0], ...products]));
    const result: MenuProductGroup[] = [];
    service.load({ ...category, subcategories: category.subcategories!.slice(0, 1) }).subscribe(group => result.push(group));
    expect(list).toHaveBeenCalledExactlyOnceWith({ commercialCategory: 'commercial-api', subcategory: 'real-slug-0' }, { fresh: true });
    expect(result[0].products.map(p => p.id)).toEqual(['0', '1', '2', '3', '4', '5']);
    expect(result[0].products.every(p => p.categorySlug === 'different-primary')).toBe(true);
  });
  it('caps concurrent requests at three and cancels outstanding work when the selection changes', () => {
    const { list, service } = setup();
    const requests: Subject<readonly Product[]>[] = [];
    list.mockImplementation(() => { const request = new Subject<readonly Product[]>(); requests.push(request); return request; });
    const subscription = service.load(category).subscribe();
    expect(requests).toHaveLength(3);
    requests[0].next([]); requests[0].complete();
    expect(requests).toHaveLength(4);
    subscription.unsubscribe();
    expect(requests.every(request => !request.observed)).toBe(true);
    expect(list).toHaveBeenCalledTimes(4);
  });
  it('reuses successful groups during an opening, but clears them for a fresh opening', () => {
    const { list, service } = setup();
    service.load(category).subscribe(); service.load(category).subscribe();
    expect(list).toHaveBeenCalledTimes(8);
    service.clear(); service.load(category).subscribe();
    expect(list).toHaveBeenCalledTimes(16);
  });
  it('isolates errors, leaves empty groups without invented products, and retries failures', () => {
    const { list, service } = setup();
    list.mockReturnValueOnce(throwError(() => new Error('offline')));
    const result: MenuProductGroup[] = [];
    service.load(category).subscribe(group => result.push(group));
    expect(result).toHaveLength(8);
    expect(result[0]).toEqual({ slug: 'real-slug-0', products: [], error: true });
    expect(result.slice(1).every(group => !group.error && group.products.length === 0)).toBe(true);
    service.load(category).subscribe();
    expect(list).toHaveBeenCalledTimes(9);
  });
});
