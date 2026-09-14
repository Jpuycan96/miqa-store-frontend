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
    const input = element.querySelector<HTMLInputElement>('#header-product-search')!;
    input.value = 'VOLANTES'; input.dispatchEvent(new Event('input'));
    TestBed.tick();
    await new Promise(resolve => setTimeout(resolve, 650));
    await harness.fixture.whenStable();
    expect(element.querySelectorAll('.catalog-card').length).toBe(1);
    expect(element.querySelector('.catalog-card h2 a')?.getAttribute('href')).toBe('/productos/volantes-a5');
    input.value = 'no existe'; input.dispatchEvent(new Event('input'));
    TestBed.tick();
    await new Promise(resolve => setTimeout(resolve, 650));
    await harness.fixture.whenStable();
    expect(element.querySelector('.empty')).toBeTruthy();
  });

  it('requires dimensions and a single material before adding AREA; resets on slug change', async () => {
    const harness = await RouterTestingHarness.create('/productos/vinil-impreso');
    const element = harness.routeNativeElement!;
    const add = element.querySelector<HTMLButtonElement>('.add-button')!;
    expect(add.disabled).toBe(true);
    for (const [id, value] of [['width', '2.5'], ['height', '1.2']]) {
      const input = element.querySelector<HTMLInputElement>('#' + id)!;
      input.value = value; input.dispatchEvent(new Event('input'));
    TestBed.tick();
    await new Promise(resolve => setTimeout(resolve, 320));
    }
    await harness.fixture.whenStable();
    expect(add.disabled).toBe(true);
    element.querySelector<HTMLInputElement>('input[type=radio]')!.click();
    expect(element.querySelector('input[type=checkbox]')).toBeNull();
    await harness.fixture.whenStable();
    expect(add.disabled).toBe(false);
    expect(element.querySelector('.area')?.textContent).toContain('3.00 m²');
    add.click(); await harness.fixture.whenStable();
    const store = TestBed.inject(QuoteStore);
    expect(store.items()[0].selectedMaterial?.name).toBe('Vinil blanco');
    expect(store.items()[0].selectedExtras ?? []).toEqual([]);
    expect(store.isOpen()).toBe(false);
    await harness.navigateByUrl('/productos/banner');
    expect(element.querySelector<HTMLInputElement>('#width')!.value).toBe('');
    expect(element.querySelector<HTMLInputElement>('input[type=radio]')!.checked).toBe(false);
  });

  it('configures PACK and QUANTITY and handles unknown products', async () => {
    const harness = await RouterTestingHarness.create('/productos/tarjetas-personales');
    const element = harness.routeNativeElement!;
    expect(element.querySelector('.presentation')?.textContent).toContain('1 millar');
    element.querySelector<HTMLButtonElement>('[aria-label="Aumentar cantidad"]')!.click();
    await harness.fixture.whenStable();
    expect(element.querySelector('#quantity-help')?.textContent).toContain('2 millares = 2,000 unidades');
    await harness.navigateByUrl('/productos/roll-up');
    expect(element.querySelector('.presentation')).toBeNull();
    expect(element.querySelector('#quantity-help')?.textContent).toContain('1 unidad');
    await harness.navigateByUrl('/productos/inexistente');
    expect(element.querySelector('h1')?.textContent).toContain('no está disponible');
    expect(element.querySelector('.add-button')).toBeNull();
  });
});
