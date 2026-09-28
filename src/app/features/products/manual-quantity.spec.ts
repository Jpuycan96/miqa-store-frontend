import { QuoteDrawer } from '../../core/quote/quote-drawer';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '../../app.routes';
import { ProductCatalog } from '../../core/data/product-catalog';
import { PRODUCTS } from '../../core/data/products.mock';
import { QuoteStore, QUOTE_STORAGE_KEY } from '../../core/quote/quote-store';
import { createQuoteItem, normalizeQuantity } from '../../core/quote/quote-utils';

const product = { ...PRODUCTS[2], minQuantity: 12, step: 12 };

beforeEach(() => {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: [provideRouter(routes), {
    provide: ProductCatalog, useValue: {
      list: () => of([product]), categories: () => of([]), findBySlug: () => of(product)
    }
  }] });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => {
  localStorage.clear(); vi.restoreAllMocks();
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});

function type(input: HTMLInputElement, value: string, finish = true) {
  input.value = value;
  input.dispatchEvent(new Event('input'));
  if (finish) input.dispatchEvent(new Event('blur'));
}

it.each(['/productos', '/productos/roll-up'])('initializes and edits quantities with relative buttons in %s', async path => {
  const h = await RouterTestingHarness.create(path);
  await h.fixture.whenStable();
  const control = h.routeNativeElement!.querySelector('.quantity-control')!;
  const input = control.querySelector('input')!;
  const buttons = control.querySelectorAll('button');
  expect(input.value).toBe('12');
  expect(input.step).toBe('1');
  for (const value of ['13', '50', '73']) {
    type(input, value); await h.fixture.whenStable(); expect(input.value).toBe(value);
  }
  type(input, '50'); await h.fixture.whenStable();
  buttons[1].click(); await h.fixture.whenStable(); expect(input.value).toBe('62');
  type(input, '50'); await h.fixture.whenStable();
  buttons[0].click(); await h.fixture.whenStable(); expect(input.value).toBe('38');
  type(input, '13'); await h.fixture.whenStable();
  buttons[0].click(); await h.fixture.whenStable(); expect(input.value).toBe('12');
  expect(buttons[0].disabled).toBe(true);
  for (const value of ['11', '0', '-9', '', 'invalid']) {
    type(input, value, false); await h.fixture.whenStable();
    if (!value) expect(input.value).toBe('');
    input.dispatchEvent(new Event('blur')); await h.fixture.whenStable();
    expect(input.value).toBe('12');
  }
  type(input, '55.9', false);
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await h.fixture.whenStable(); expect(input.value).toBe('55');
  type(input, '50'); await h.fixture.whenStable();
  h.routeNativeElement!.querySelector<HTMLButtonElement>('.quick-add, .add-button')!.click();
  await h.fixture.whenStable();
  expect(TestBed.inject(QuoteStore).items()[0].quantity).toBe(50);
});

it.each(['app-quote-panel', 'app-quote-drawer'])('preserves manual quantities and exact WhatsApp text from %s', async selector => {
  const h = await RouterTestingHarness.create('/productos');
  const store = TestBed.inject(QuoteStore);
  expect(store.addItem(product, { quantity: 50 })).toBe(true);
  const drawer = selector === 'app-quote-drawer' ? TestBed.createComponent(QuoteDrawer) : null;
  if (drawer) { drawer.detectChanges(); store.open(); }
  await h.fixture.whenStable();
  const panel: HTMLElement = drawer ? drawer.nativeElement : h.routeNativeElement!.querySelector(selector)!;
  const input = panel.querySelector<HTMLInputElement>('.quantity-control input')!;
  expect(input.value).toBe('50');
  type(input, '55', false); await h.fixture.whenStable();
  expect(store.items()[0].quantity).toBe(55);
  expect(JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY)!)[0].quantity).toBe(55);
  expect(new URL(store.whatsappUrl()).searchParams.get('text')).toContain('55 unidades');
  expect(panel.querySelector('a[href^="https://wa.me/"]')).toBeNull();
  input.dispatchEvent(new Event('blur'));
  type(input, '13'); await h.fixture.whenStable();
  panel.querySelector<HTMLButtonElement>('[aria-label^="Reducir"]')!.click();
  await h.fixture.whenStable(); expect(input.value).toBe('12');
  type(input, ''); await h.fixture.whenStable(); expect(input.value).toBe('12');
});

it('validates all application entry points without imposing multiples and restores exact values', () => {
  const store = TestBed.inject(QuoteStore);
  for (const quantity of [0, -1, 11, 12.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    expect(createQuoteItem(product, { quantity }, 'test')).toBeNull();
    expect(store.addItem(product, { quantity })).toBe(false);
    expect(normalizeQuantity(quantity, 12)).toBe(12);
  }
  const saved = createQuoteItem(product, { quantity: 55 }, 'saved')!;
  localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify([saved]));
  store.restore();
  expect(store.items()[0].quantity).toBe(55);
  expect(store.updateQuantity(store.items()[0].id, 11)).toBe(false);
  expect(new URL(store.whatsappUrl()).searchParams.get('text')).toContain('55 unidades');
  for (const quantity of [100, 150, 237]) expect(createQuoteItem({ ...product, minQuantity: 100, step: 100 }, { quantity }, 'test')).toBeTruthy();
  expect(createQuoteItem({ ...product, minQuantity: 100 }, { quantity: 99 }, 'test')).toBeNull();
});
