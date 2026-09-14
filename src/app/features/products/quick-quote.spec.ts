import { provideTestCatalog } from '../../testing/catalog.fixture';
﻿import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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

  it('filters using category chips and preserves name search', async () => {
    const h = await RouterTestingHarness.create('/productos');
    const el = h.routeNativeElement!;
    const search = el.querySelector<HTMLInputElement>('#product-search')!;
    search.value = 'tarjetas'; search.dispatchEvent(new Event('input'));
    TestBed.tick();
    await new Promise(resolve => setTimeout(resolve, 320));
    const chips = Array.from(el.querySelectorAll<HTMLButtonElement>('.category-chips button'));
    chips.find(b => b.textContent?.includes('Imprenta'))!.click();
    await h.fixture.whenStable();
    expect(el.querySelectorAll('.catalog-card')).toHaveLength(1);
    expect(search.value).toBe('tarjetas');
    expect(chips.find(b => b.textContent?.includes('Imprenta'))!.getAttribute('aria-pressed')).toBe('true');
    chips.find(b => b.textContent?.includes('gran formato'))!.click();
    await h.fixture.whenStable();
    expect(el.querySelectorAll('.catalog-card')).toHaveLength(0);
  });

  it('adds PACK and QUANTITY from cards, updates header and keeps the drawer closed', async () => {
    const h = await RouterTestingHarness.create('/productos');
    const el = h.routeNativeElement!;
    const pack = el.querySelector('[data-product="tarjetas-personales"]')!;
    pack.querySelector<HTMLButtonElement>('[aria-label^="Aumentar"]')!.click();
    await h.fixture.whenStable();
    expect(pack.querySelector('.purchase-row output')?.textContent).toBe('2');
    pack.querySelector<HTMLButtonElement>('.quick-add')!.click();
    el.querySelector<HTMLButtonElement>('[data-product="roll-up"] .quick-add')!.click();
    await h.fixture.whenStable();
    const store = TestBed.inject(QuoteStore);
    expect(store.items().map(i => [i.saleType, i.quantity])).toEqual([['PACK', 2], ['QUANTITY', 1]]);
    expect(store.isOpen()).toBe(false);
    expect(el.querySelector('.quote-count')?.textContent).toBe('2');
    expect(store.confirmation()).toContain('Roll Up');
    const panel = el.querySelector('app-quote-panel')!;
    expect(panel.querySelectorAll('li')).toHaveLength(2);
    expect(panel.querySelector('.configuration')?.textContent).toContain('2 millares');
    panel.querySelector<HTMLButtonElement>('[aria-label^="Aumentar"]')!.click();
    await h.fixture.whenStable();
    expect(store.items()[0].quantity).toBe(3);
    expect(new URL(panel.querySelector<HTMLAnchorElement>('.panel-whatsapp')!.href).searchParams.get('text')).toContain('3 millares');
    panel.querySelector<HTMLButtonElement>('.remove')!.click();
    await h.fixture.whenStable();
    expect(store.items()).toHaveLength(1);
    expect(panel.querySelectorAll('li')).toHaveLength(1);
    expect(el.querySelector('.quote-count')?.textContent).toBe('1');
    el.querySelector<HTMLButtonElement>('.quote-toggle')!.click();
    expect(store.isOpen()).toBe(true);
  });

  it('configures AREA in a modal, validates input and adds without navigating or opening the drawer', async () => {
    const h = await RouterTestingHarness.create('/productos');
    const el = h.routeNativeElement!;
    el.querySelector<HTMLButtonElement>('[data-product="vinil-impreso"] .configure')!.click();
    await h.fixture.whenStable();
    const dialog = el.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    const add = dialog.querySelector<HTMLButtonElement>('.area-add')!;
    expect(add.disabled).toBe(true);
    for (const [id, value] of [['area-width', '2.5'], ['area-height', '1.2']]) {
      const input = el.querySelector<HTMLInputElement>('#' + id)!;
      input.value = value; input.dispatchEvent(new Event('input'));
    TestBed.tick();
    await new Promise(resolve => setTimeout(resolve, 320));
    }
    await h.fixture.whenStable();
    expect(add.disabled).toBe(true);
    dialog.querySelector<HTMLInputElement>('input[type=radio]')!.click();
    expect(dialog.querySelector('input[type=checkbox]')).toBeNull();
    await h.fixture.whenStable();
    expect(add.disabled).toBe(false);
    add.click(); await h.fixture.whenStable();
    const store = TestBed.inject(QuoteStore);
    expect(store.items()[0].areaSquareMeters).toBe(3);
    expect(store.isOpen()).toBe(false);
    expect(new URL(store.whatsappUrl()).searchParams.get('text')).toContain('2.50 m x 1.20 m = 3.00 m² — Material: Vinil blanco');
    expect(el.querySelector('dialog')).toBeNull();
    expect(el.querySelector('#catalog-title')).toBeTruthy();
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(window.scrollTo).toHaveBeenCalledWith({ left: 0, top: 0, behavior: 'instant' });
    el.querySelector<HTMLButtonElement>('[data-product="banner"] .configure')!.click();
    await h.fixture.whenStable();
    el.querySelector('dialog')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await h.fixture.whenStable();
    expect(el.querySelector('dialog')).toBeNull();
  });

  it('opens an accessible image viewer and navigates from the product name', async () => {
    const h = await RouterTestingHarness.create('/productos');
    const image = h.routeNativeElement!.querySelector<HTMLButtonElement>('.product-image .open-image')!;
    expect(image.getAttribute('tabindex')).not.toBe('-1');
    expect(image.getAttribute('aria-hidden')).not.toBe('true');
    image.click();
    await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelector('app-product-image-lightbox dialog[open]')).toBeTruthy();
    expect(h.routeNativeElement!.querySelector('#catalog-title')).toBeTruthy();
    expect(TestBed.inject(QuoteStore).totalItems()).toBe(0);
    h.routeNativeElement!.querySelector<HTMLButtonElement>('[aria-label="Cerrar visor"]')!.click();
    await h.fixture.whenStable();
    h.routeNativeElement!.querySelector<HTMLAnchorElement>('[data-product="roll-up"] h2 a')!.click();
    await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelector('#product-title')?.textContent).toContain('Roll Up');
  });
});
