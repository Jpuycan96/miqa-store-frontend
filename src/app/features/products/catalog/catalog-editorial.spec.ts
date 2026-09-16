import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { PRODUCT_CATEGORIES } from '../../../core/data/products.mock';
import { provideTestCatalog } from '../../../testing/catalog.fixture';

describe('Catalog category editorial heading', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes), provideTestCatalog()] }));

  it('renders API category editorial content, reacts to URL changes and restores Todos', async () => {
    const harness = await RouterTestingHarness.create('/productos?categoria=impresion-gran-formato');
    const heading = () => harness.routeNativeElement!.querySelector('.catalog-heading')!;

    for (const category of PRODUCT_CATEGORIES) {
      await harness.navigateByUrl(`/productos?categoria=${category.slug}`);
      expect(heading().textContent).toContain(category.name);
      expect(heading().textContent).toContain(category.catalogHeadline);
      expect(heading().textContent).toContain(category.catalogDescription);
      expect(heading().classList).toContain('category-editorial');
    }

    await harness.navigateByUrl('/productos');
    expect(heading().textContent).toContain('PRODUCTOS MIQA');
    expect(heading().textContent).toContain('Encuentra lo que necesitas.');
    expect(heading().classList).not.toContain('category-editorial');
    expect(harness.routeNativeElement!.querySelectorAll('.catalog-card').length).toBeGreaterThan(3);
  });
});
