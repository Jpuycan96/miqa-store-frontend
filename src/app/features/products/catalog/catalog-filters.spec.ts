import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '../../../app.routes';
import { ProductCatalog } from '../../../core/data/product-catalog';
import { PRODUCTS } from '../../../core/data/products.mock';
import { provideTestCatalog } from '../../../testing/catalog.fixture';

describe('Catalog URL filters', () => {
  const source = provideTestCatalog().useValue;
  const list = vi.fn(() => of([PRODUCTS[1], { ...PRODUCTS[2], published: false }, PRODUCTS[0]]));
  const commercialCategories = vi.fn(source.commercialCategories);

  beforeEach(() => {
    list.mockClear();
    commercialCategories.mockClear();
    TestBed.configureTestingModule({ providers: [
      provideRouter(routes),
      { provide: ProductCatalog, useValue: { ...source, list, commercialCategories } },
    ] });
  });

  it('loads commercial and search filters from the URL and retains them in product links', async () => {
    const url = '/productos?commercialCategory=commercial-parent&subcategory=custom-sub&buscar=vinil';
    const harness = await RouterTestingHarness.create(url);
    const root = harness.routeNativeElement!;
    expect(list).toHaveBeenLastCalledWith({
      category: '', search: 'vinil', commercialCategory: 'commercial-parent', subcategory: 'custom-sub',
    }, { fresh: false });
    expect([...root.querySelectorAll('.catalog-card')].map(card => card.getAttribute('data-product')))
      .toEqual([PRODUCTS[1].slug, PRODUCTS[0].slug]);
    const href = root.querySelector('.product-name-link')!.getAttribute('href')!;
    const router = TestBed.inject(Router);
    expect(router.parseUrl(href).queryParams['regresar']).toBe(url);
    expect(root.querySelector('.catalog-sidebar, .category-toggle, #catalog-categories, .catalog-decoration')).toBeNull();
    expect(commercialCategories).toHaveBeenCalledTimes(1);

    await harness.navigateByUrl('/productos?commercialCategory=another-parent&buscar=vinil');
    expect(list).toHaveBeenLastCalledWith({
      category: '', search: 'vinil', commercialCategory: 'another-parent',
    }, { fresh: false });

    await harness.navigateByUrl('/productos');
    expect(list).toHaveBeenLastCalledWith({ category: '', search: '' }, { fresh: false });
  });
});
