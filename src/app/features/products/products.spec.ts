import { of } from 'rxjs';
import { ProductCatalog } from '../../core/data/product-catalog';
import { erpProduct } from '../../testing/erp.fixture';
import { provideTestCatalog } from '../../testing/catalog.fixture';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { QuoteStore, QUOTE_STORAGE_KEY } from '../../core/quote/quote-store';

beforeEach(() => TestBed.configureTestingModule({ providers: [provideTestCatalog()] }));

describe('Local catalog and configurator', () => {
  beforeEach(() => {
    localStorage.removeItem(QUOTE_STORAGE_KEY);
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });
  afterEach(() => localStorage.removeItem(QUOTE_STORAGE_KEY));

  it('uses category query params and name search, including empty states', async () => {
    const harness = await RouterTestingHarness.create('/productos?categoria=imprenta-papeleria');
    const element = harness.routeNativeElement!;
    expect(element.querySelectorAll('.catalog-card').length).toBe(2);
    expect(element.querySelector('.category-chips')).toBeNull();
    const input = element.querySelector<HTMLInputElement>('#header-product-search')!;
    input.value = 'VOLANTES'; input.dispatchEvent(new Event('input'));
    TestBed.tick();
    await new Promise(resolve => setTimeout(resolve, 650));
    await harness.fixture.whenStable();
    expect(element.querySelectorAll('.catalog-card').length).toBe(1);
    expect(element.querySelector('.catalog-card .product-image')?.getAttribute('href')).toContain('/productos/volantes-a5?regresar=');
    input.value = 'no existe'; input.dispatchEvent(new Event('input'));
    TestBed.tick();
    await new Promise(resolve => setTimeout(resolve, 650));
    await harness.fixture.whenStable();
    expect(element.querySelector('.empty')).toBeTruthy();
    const allUrl = element.querySelector('app-header a.all')!.getAttribute('href')!;
    expect(allUrl).toBe('/productos');
    await harness.navigateByUrl(allUrl);
    await new Promise(resolve => setTimeout(resolve, 650));
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.querySelectorAll('.catalog-card').length).toBeGreaterThan(2);
  });

  it.each(['vinil-impreso', 'tarjetas-personales', 'roll-up'])('does not configure legacy product %s', async slug => {
    const harness = await RouterTestingHarness.create('/productos/' + slug);
    await harness.fixture.whenStable();
    const element = harness.routeNativeElement!;
    expect(element.textContent).toContain('disponible para configurar');
    expect(element.querySelector('form')).toBeNull();
    expect(element.querySelector('app-erp-configurator')).toBeNull();
    expect(TestBed.inject(QuoteStore).items()).toEqual([]);
    await harness.navigateByUrl('/productos/inexistente');
    expect(harness.routeNativeElement!.querySelector('.unavailable')).not.toBeNull();
  });

  it.each(['ERP', 'UNAVAILABLE', 'LEGACY', undefined] as const)('handles configuration mode %s without a legacy fallback', async mode => {
    const product = { ...erpProduct('ESCALA'), configuration: mode ? { ...erpProduct('ESCALA').configuration!, mode } : undefined };
    TestBed.overrideProvider(ProductCatalog, { useValue: { categories: () => of([]), findBySlug: () => of(product) } });
    const harness = await RouterTestingHarness.create('/productos/erp-banner');
    await harness.fixture.whenStable();
    const element = harness.routeNativeElement!;
    expect(!!element.querySelector('app-erp-configurator')).toBe(mode === 'ERP');
    if (mode !== 'ERP') {
      expect(element.textContent).toContain('disponible para configurar');
      expect(element.querySelector('form')).toBeNull();
    }
  });

  it('keeps a product slug on the detail route instead of treating it as a category', async () => {
    const harness = await RouterTestingHarness.create('/productos/tarjetas-personales');
    expect(harness.routeNativeElement!.querySelector('.product-detail h1')?.textContent).toContain('Tarjetas personales');
    expect(harness.routeNativeElement!.querySelector('.catalog')).toBeNull();
    expect(document.querySelector('script[data-miqa-seo-jsonld]')?.textContent).not.toContain('"@type":"Product"');
  });
});
