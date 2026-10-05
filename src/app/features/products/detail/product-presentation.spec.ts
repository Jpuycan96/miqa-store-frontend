import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ProductDetail } from './product-detail';
import { ProductCatalog } from '../../../core/data/product-catalog';
import { PublicPricing } from '../../../core/data/public-pricing';
import { QuoteStore } from '../../../core/quote/quote-store';
import { QuotePresentation } from '../../../core/quote/quote-presentation';
import { PRODUCTS } from '../../../core/data/products.mock';
import { erpProduct } from '../../../testing/erp.fixture';
import { Product } from '../../../shared/models/product';

describe('Shared product detail presentation', () => {
  let desktop: boolean;
  let mediaEvents: EventTarget;
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear(); desktop = true; mediaEvents = new EventTarget();
    vi.stubGlobal('matchMedia', () => ({ get matches() { return desktop; },
      addEventListener: mediaEvents.addEventListener.bind(mediaEvents),
      removeEventListener: mediaEvents.removeEventListener.bind(mediaEvents) }));
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear(); });
  async function setup(product: Product) {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ slug: product.slug })), snapshot: { paramMap: convertToParamMap({ slug: product.slug }) } } },
      { provide: PublicPricing, useValue: { evaluate: () => of({ status: 'QUOTE_REQUIRED' }) } },
      { provide: ProductCatalog, useValue: { findBySlug: () => of(product), categories: () => of([]), list: () => of([product]) } }
    ] });
    const fixture = TestBed.createComponent(ProductDetail); await fixture.whenStable(); return fixture;
  }
  it.each(['ERP', 'LEGACY', 'UNAVAILABLE'] as const)('shares the desktop shell while keeping the %s branch', async mode => {
    const source = mode === 'ERP' ? erpProduct() : PRODUCTS[2];
    const product: Product = { ...source, id: 'another-product', slug: 'another-product', name: 'Otro producto',
      configuration: mode === 'ERP' ? source.configuration : mode === 'UNAVAILABLE' ? { ...erpProduct().configuration!, mode: 'UNAVAILABLE' } : undefined };
    const fixture = await setup(product); const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.compact-detail')).not.toBeNull();
    expect(el.querySelector('#integrated-quote-panel')).not.toBeNull();
    expect(!!el.querySelector('app-erp-configurator')).toBe(mode === 'ERP');
    expect(!!el.querySelector('.add-button')).toBe(mode === 'LEGACY');
    expect(TestBed.inject(QuotePresentation).integrated()).toBe(true);
    fixture.destroy(); expect(TestBed.inject(QuotePresentation).productDetail()).toBe(false);
  });
  it('opens after a legacy addition, collapses and reopens with the counter', async () => {
    const fixture = await setup(PRODUCTS[2]); const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('.add-button')!.click(); await fixture.whenStable();
    const store = TestBed.inject(QuoteStore); expect(store.items()).toHaveLength(1); expect(store.isOpen()).toBe(true);
    expect(el.querySelector('.quote-expanded')).not.toBeNull();
    el.querySelector<HTMLButtonElement>('.collapse-quote')!.click(); await fixture.whenStable();
    expect(store.isOpen()).toBe(false); expect(el.querySelector('.quote-tab')?.textContent?.trim()).toBe('1');
    el.querySelector<HTMLButtonElement>('.quote-tab')!.click(); await fixture.whenStable();
    expect(store.isOpen()).toBe(true); expect(el.querySelector('.quote-tab')).toBeNull();
    desktop = false; mediaEvents.dispatchEvent(new Event('change')); await fixture.whenStable();
    expect(TestBed.inject(QuotePresentation).integrated()).toBe(false);
    expect(el.querySelector('#integrated-quote-panel')).toBeNull();
    desktop = true; mediaEvents.dispatchEvent(new Event('change')); await fixture.whenStable();
    expect(el.querySelector('.quote-expanded')).not.toBeNull();
  });
  it('preserves the mobile legacy addition behavior and leaves presentation to the drawer', async () => {
    desktop = false; const fixture = await setup(PRODUCTS[2]);
    fixture.componentInstance.add(); await fixture.whenStable();
    expect(TestBed.inject(QuoteStore).items()).toHaveLength(1);
    expect(TestBed.inject(QuoteStore).isOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('#integrated-quote-panel')).toBeNull();
  });
  it('still opens the quotation after an ERP addition', async () => {
    const fixture = await setup(erpProduct()); const el: HTMLElement = fixture.nativeElement;
    for (const id of ['erp-ancho', 'erp-alto']) {
      const input = el.querySelector<HTMLInputElement>('#' + id)!; input.value = '2'; input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await fixture.whenStable(); el.querySelector<HTMLButtonElement>('app-erp-configurator button[type=submit]')!.click();
    await fixture.whenStable(); expect(TestBed.inject(QuoteStore).items()).toHaveLength(1);
    expect(TestBed.inject(QuoteStore).isOpen()).toBe(true); expect(el.querySelector('.quote-expanded')).not.toBeNull();
  });
});
