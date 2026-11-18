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
  const commercialCategories = vi.fn(() => of([
    { slug: 'commercial-parent', name: 'Categoría de prueba', subcategories: [
      { slug: 'custom-sub', name: 'Subcategoría de prueba', erpSubcategoryId: '2', erpCategoryId: '9', displayOrder: 0 },
    ] },
    { slug: 'another-parent', name: 'Otra categoría' },
  ]));

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
    expect(root.querySelector('.catalog-decoration')).toBeNull();
    const sidebar = root.querySelector('#catalog-categories')!;
    expect(sidebar.querySelector('.catalog-subcategories [aria-current=page]')?.textContent).toBe('Subcategoría de prueba');
    expect(sidebar.querySelector('.active-category')?.textContent?.trim()).toBe('Categoría de prueba');

    const link = [...sidebar.querySelectorAll('a')].find(anchor => anchor.textContent?.trim() === 'Otra categoría')!;
    link.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/productos?commercialCategory=another-parent&buscar=vinil');
    expect(list).toHaveBeenLastCalledWith({
      category: '', search: 'vinil', commercialCategory: 'another-parent',
    }, { fresh: false });

    sidebar.querySelector('a')!.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/productos?buscar=vinil');
    expect(list).toHaveBeenLastCalledWith({ category: '', search: 'vinil' }, { fresh: false });
  });
});
