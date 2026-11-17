import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { routes } from '../../../app.routes';
import { ProductCatalog } from '../../../core/data/product-catalog';
import { PRODUCTS } from '../../../core/data/products.mock';
import { ProductCategory } from '../../../shared/models/product';
import { provideTestCatalog } from '../../../testing/catalog.fixture';

const categories: readonly ProductCategory[] = [
  { slug: 'commercial-parent', name: 'Categoría de la API', subcategories: [
    { slug: 'custom-sub', name: 'Subcategoría de la API', erpSubcategoryId: '2', erpCategoryId: '9', displayOrder: 0 },
  ] },
  { slug: 'another-commercial-parent', name: 'Otra categoría de la API' },
];

describe('Catalog commercial sidebar', () => {
  const source = provideTestCatalog().useValue;
  const list = vi.fn(() => of([PRODUCTS[1], { ...PRODUCTS[2], published: false }, PRODUCTS[0]]));
  const commercialCategories = vi.fn(() => of(categories));

  beforeEach(() => {
    list.mockClear();
    commercialCategories.mockClear();
    TestBed.configureTestingModule({ providers: [
      provideRouter(routes),
      { provide: ProductCatalog, useValue: { ...source, list, commercialCategories } },
    ] });
  });

  it('restores URL selection, keeps API order and clears incompatible filters while preserving search', async () => {
    const harness = await RouterTestingHarness.create(
      '/productos?categoria=legacy&commercialCategory=commercial-parent&subcategory=custom-sub&buscar=vinil',
    );
    const root = harness.routeNativeElement!;
    const link = (name: string) => [...root.querySelectorAll<HTMLAnchorElement>('#catalog-categories a')]
      .find(anchor => anchor.textContent?.trim() === name)!;
    expect(link('Subcategoría de la API').getAttribute('aria-current')).toBe('page');
    expect(link('Categoría de la API').classList.contains('active-category')).toBe(true);
    expect(list).toHaveBeenLastCalledWith({
      category: 'legacy', search: 'vinil', commercialCategory: 'commercial-parent', subcategory: 'custom-sub',
    }, { fresh: false });
    expect([...root.querySelectorAll('.catalog-card')].map(card => card.getAttribute('data-product')))
      .toEqual([PRODUCTS[1].slug, PRODUCTS[0].slug]);
    expect(root.querySelector('.catalog-decoration')).toBeNull();

    const navigate = async (anchor: HTMLAnchorElement) => {
      anchor.click();
      await harness.fixture.whenStable();
      return TestBed.inject(Router).url;
    };
    expect(await navigate(link('Otra categoría de la API')))
      .toBe('/productos?commercialCategory=another-commercial-parent&buscar=vinil');
    expect(link('Subcategoría de la API')).toBeUndefined();
    expect(await navigate(link('Categoría de la API')))
      .toBe('/productos?commercialCategory=commercial-parent&buscar=vinil');
    expect(await navigate(link('Subcategoría de la API')))
      .toBe('/productos?commercialCategory=commercial-parent&subcategory=custom-sub&buscar=vinil');
    expect(await navigate(link('Todas las categorías'))).toBe('/productos?buscar=vinil');
    expect(link('Todas las categorías').getAttribute('aria-current')).toBe('page');
  });

  it('opens the mobile disclosure and restores focus when dismissed with Escape', async () => {
    const harness = await RouterTestingHarness.create('/productos');
    const toggle = harness.routeNativeElement!.querySelector<HTMLButtonElement>('.category-toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await harness.fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const firstLink = harness.routeNativeElement!.querySelector<HTMLAnchorElement>('#catalog-categories a')!;
    firstLink.focus();
    firstLink.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await harness.fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });

  it('keeps products available and retries a failed commercial tree separately', async () => {
    const offline = () => throwError(() => new Error('offline'));
    commercialCategories.mockImplementationOnce(offline).mockImplementationOnce(offline);
    const harness = await RouterTestingHarness.create('/productos');
    const root = harness.routeNativeElement!;
    await harness.fixture.whenStable();
    expect(root.querySelectorAll('.catalog-card')).toHaveLength(2);
    root.querySelector<HTMLButtonElement>('.category-retry')!.click();
    await harness.fixture.whenStable();
    expect(root.querySelector('#catalog-categories')?.textContent).toContain('Categoría de la API');
    expect(list).toHaveBeenCalledTimes(1);
  });
});
