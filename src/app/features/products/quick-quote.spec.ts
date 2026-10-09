import { provideTestCatalog } from '../../testing/catalog.fixture';
﻿import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { QuoteStore, QUOTE_STORAGE_KEY } from '../../core/quote/quote-store';

beforeEach(() => TestBed.configureTestingModule({ providers: [provideTestCatalog()] }));

describe('Quick catalog quoting', () => {
  beforeEach(() => {
    localStorage.removeItem(QUOTE_STORAGE_KEY);
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
  });
  afterEach(() => { vi.restoreAllMocks(); Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal'); Reflect.deleteProperty(HTMLDialogElement.prototype, 'close'); localStorage.removeItem(QUOTE_STORAGE_KEY); });

  it('combines category URL filters with name search without duplicate category controls', async () => {
    const h = await RouterTestingHarness.create('/productos');
    const el = h.routeNativeElement!;
    const search = el.querySelector<HTMLInputElement>('#header-product-search')!;
    search.value = 'tarjetas'; search.dispatchEvent(new Event('input'));
    TestBed.tick();
    await new Promise(resolve => setTimeout(resolve, 650));
    expect(el.querySelector('.category-chips')).toBeNull();
    await h.navigateByUrl('/productos?categoria=imprenta-papeleria&buscar=tarjetas');
    await h.fixture.whenStable();
    expect(el.querySelectorAll('.catalog-card')).toHaveLength(1);
    expect(search.value).toBe('tarjetas');
    await h.navigateByUrl('/productos?categoria=impresion-gran-formato&buscar=tarjetas');
    await h.fixture.whenStable();
    expect(el.querySelectorAll('.catalog-card')).toHaveLength(0);
  });

  it('opens the existing configurator from cards without adding or quantity controls', async () => {
    const h = await RouterTestingHarness.create('/productos');
    const el = h.routeNativeElement!;
    expect(el.querySelector('app-quote-panel')).toBeNull();
    expect(el.querySelector('.quantity-control')).toBeNull();
    const add = el.querySelector<HTMLButtonElement>('[data-product="tarjetas-personales"] .configure')!;
    expect(add.textContent).toContain('Agregar al carrito');
    add.click(); await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelector('#product-title')?.textContent).toContain('Tarjetas');
    expect(TestBed.inject(QuoteStore).items()).toHaveLength(0);
    h.routeNativeElement!.querySelector<HTMLAnchorElement>('.return-products')!.click();
    await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelector('#catalog-title')).toBeTruthy();
    expect(TestBed.inject(Router).url).toBe('/productos');
    expect(h.routeNativeElement!.querySelectorAll('.catalog-card').length).toBeGreaterThan(0);
  });

  it('shows and hides the panel as lines are added and removed, preserving quantity edits', async () => {
    const h = await RouterTestingHarness.create('/productos');
    const store = TestBed.inject(QuoteStore);
    const { PRODUCTS } = await import('../../core/data/products.mock');
    store.addItem(PRODUCTS[0], { quantity: 1 });
    store.addItem(PRODUCTS[2], { quantity: 1 });
    await h.fixture.whenStable();
    const panel = h.routeNativeElement!.querySelector('app-quote-panel')!;
    expect(panel.querySelectorAll('li')).toHaveLength(2);
    expect(panel.querySelectorAll('app-product-image')).toHaveLength(2);
    panel.querySelector<HTMLButtonElement>('[aria-label^="Aumentar"]')!.click();
    await h.fixture.whenStable();
    expect(store.items()[0].quantity).toBe(2);
    expect(store.items()).toHaveLength(2);
    for (const item of store.items()) store.removeItem(item.id);
    await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelector('app-quote-panel')).toBeNull();
    expect(h.routeNativeElement!.querySelector('.has-quote')).toBeNull();
  });

  it('opens the AREA detail and validates measures before adding', async () => {
    const h = await RouterTestingHarness.create('/productos');
    h.routeNativeElement!.querySelector<HTMLButtonElement>('[data-product="vinil-impreso"] .configure')!.click();
    await h.fixture.whenStable();
    const el = h.routeNativeElement!;
    const add = el.querySelector<HTMLButtonElement>('.add-button')!;
    expect(add.disabled).toBe(true);
    for (const id of ['width', 'height']) {
      const input = el.querySelector<HTMLInputElement>('#' + id)!;
      input.value = '2'; input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    el.querySelector<HTMLInputElement>('input[type=radio]')!.click();
    await h.fixture.whenStable();
    expect(add.disabled).toBe(false); add.click(); await h.fixture.whenStable();
    expect(TestBed.inject(QuoteStore).items()[0].areaSquareMeters).toBe(4);
  });

  it('navigates from the image while the name remains plain text', async () => {
    const h = await RouterTestingHarness.create('/productos');
    expect(h.routeNativeElement!.querySelector('.catalog-card h2 a')).toBeNull();
    h.routeNativeElement!.querySelector<HTMLAnchorElement>('[data-product="roll-up"] .product-image')!.click();
    await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelector('#product-title')?.textContent).toContain('Roll Up');
    expect(h.routeNativeElement!.querySelector('app-product-image-lightbox')).toBeNull();
    expect(TestBed.inject(QuoteStore).totalItems()).toBe(0);
  });

  it.each(['/productos', '/productos/merchandising?buscar=llavero', '/productos/letreros-publicitarios?buscar=acrilico', '/productos?categoria=imprenta-papeleria&buscar=Tarjetas'])('returns to the safe catalog origin %s without losing lines', async origin => {
    const h = await RouterTestingHarness.create('/productos/roll-up?regresar=' + encodeURIComponent(origin));
    const { PRODUCTS } = await import('../../core/data/products.mock');
    const store = TestBed.inject(QuoteStore);
    store.addItem(PRODUCTS[2], { quantity: 1 });
    await h.fixture.whenStable();
    h.routeNativeElement!.querySelector<HTMLAnchorElement>('.return-products')!.click();
    await h.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe(origin);
    expect(store.items()).toHaveLength(1);
  });

  it.each(['https://external.example', '//external.example', '/admin/productos', '/productos/roll-up'])('uses the catalog fallback for unsafe return %s', async origin => {
    const h = await RouterTestingHarness.create('/productos/roll-up?regresar=' + encodeURIComponent(origin));
    expect(h.routeNativeElement!.querySelector('.return-products')?.getAttribute('href')).toBe('/productos');
  });
});
