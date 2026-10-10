import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { By } from '@angular/platform-browser';
import { ErpConfigurator } from '../erp-configurator/erp-configurator';
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
    vi.stubGlobal('matchMedia', (query: string) => ({ get matches() { return query.includes('max-width') ? !desktop : desktop; },
      addEventListener: mediaEvents.addEventListener.bind(mediaEvents),
      removeEventListener: mediaEvents.removeEventListener.bind(mediaEvents) }));
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear(); });
  async function setup(product: Product, updates?: Observable<Product | undefined>) {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ slug: product.slug })), snapshot: { paramMap: convertToParamMap({ slug: product.slug }) } } },
      { provide: PublicPricing, useValue: { evaluate: () => of({ status: 'QUOTE_REQUIRED' }) } },
      { provide: ProductCatalog, useValue: { findBySlug: () => updates ?? of(product), categories: () => of([]), list: () => of([product]) } }
    ] });
    const fixture = TestBed.createComponent(ProductDetail); await fixture.whenStable(); return fixture;
  }
  it.each(['ERP', 'LEGACY', 'UNAVAILABLE'] as const)('shares the desktop shell while keeping the %s branch', async mode => {
    const source = mode === 'ERP' ? erpProduct() : PRODUCTS[2];
    const product: Product = { ...source, id: 'another-product', slug: 'another-product', name: 'Otro producto',
      configuration: mode === 'ERP' ? source.configuration : mode === 'UNAVAILABLE' ? { ...erpProduct().configuration!, mode: 'UNAVAILABLE' } : undefined };
    const fixture = await setup(product); const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.compact-detail')).not.toBeNull();
    expect(el.querySelector('#integrated-quote-panel')).toBeNull();
    expect(!!el.querySelector('app-erp-configurator')).toBe(mode === 'ERP');
    expect(!!el.querySelector('.add-button')).toBe(mode === 'LEGACY');
    expect(TestBed.inject(QuotePresentation).productDetail()).toBe(true);
    fixture.destroy(); expect(TestBed.inject(QuotePresentation).productDetail()).toBe(false);
  });
  it('shows the integrated panel after adding and removes it with the last line', async () => {
    const fixture = await setup(PRODUCTS[2]); const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('.add-button')!.click(); await fixture.whenStable();
    const store = TestBed.inject(QuoteStore);
    expect(store.items()).toHaveLength(1);
    expect(el.querySelector('.quote-expanded')).not.toBeNull();
    expect(el.querySelectorAll('app-quote-panel')).toHaveLength(1);
    expect(el.querySelector('app-quote-drawer')).toBeNull();
    store.close(); await fixture.whenStable();
    expect(el.querySelector('#integrated-quote-panel')).not.toBeNull();
    store.removeItem(store.items()[0].id); await fixture.whenStable();
    expect(el.querySelector('#integrated-quote-panel')).toBeNull();
    expect(el.querySelector('.quote-expanded')).toBeNull();
  });
  it('uses the same integrated panel on mobile after a legacy addition', async () => {
    desktop = false; const fixture = await setup(PRODUCTS[2]);
    fixture.componentInstance.add(); await fixture.whenStable();
    expect(TestBed.inject(QuoteStore).items()).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('#integrated-quote-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-quote-drawer')).toBeNull();
  });
  it('still opens the quotation after an ERP addition', async () => {
    const fixture = await setup(erpProduct()); const el: HTMLElement = fixture.nativeElement;
    for (const id of ['erp-ancho', 'erp-alto']) {
      const input = el.querySelector<HTMLInputElement>('#' + id)!; input.value = '2'; input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await fixture.whenStable(); el.querySelector<HTMLButtonElement>('app-erp-configurator button[type=submit]')!.click();
    await fixture.whenStable(); expect(TestBed.inject(QuoteStore).items()).toHaveLength(1);
    expect(TestBed.inject(QuoteStore).isOpen()).toBe(false); expect(el.querySelector('.quote-expanded')).not.toBeNull();
  });
  it('keeps the configurator mounted and preserves valid drafts during an ERP options refresh', async () => {
    const product = erpProduct();
    const fixture = await setup(product);
    const configurator = fixture.debugElement.query(By.directive(ErpConfigurator)).componentInstance as ErpConfigurator;
    configurator.form.patchValue({ quantity: 2.5, material: '19', notes: 'Mi proyecto', measures: {ancho: 2, alto: 3} });
    await fixture.whenStable();
    const response = new Subject<Product | undefined>();
    vi.spyOn(TestBed.inject(ProductCatalog), 'findBySlug').mockReturnValue(response);
    fixture.componentInstance.retry(); await fixture.whenStable();
    expect(fixture.componentInstance.state().loading).toBe(true);
    expect(fixture.debugElement.query(By.directive(ErpConfigurator)).componentInstance).toBe(configurator);
    const revised = structuredClone(product); revised.configuration!.configurationVersion = '5';
    response.next(revised); response.complete(); await fixture.whenStable();
    expect(fixture.debugElement.query(By.directive(ErpConfigurator)).componentInstance).toBe(configurator);
    expect(configurator.form.getRawValue()).toEqual({quantity: 2.5, material: '19', model: '', notes: 'Mi proyecto', measures: {ancho: 2, alto: 3}});
    expect(configurator.selection().erp.configurationVersion).toBe('5');
    expect(configurator.canAdd()).toBe(true);
  });

  it.each(['ERP', 'LEGACY'] as const)('preserves the %s draft and quote when the hydration stream revalidates the same product', async mode => {
    const product = mode === 'ERP' ? erpProduct() : PRODUCTS[2];
    const updates = new BehaviorSubject<Product | undefined>(product);
    const fixture = await setup(product, updates);
    const quote = TestBed.inject(QuoteStore);
    quote.addItem(PRODUCTS[0], { quantity: 3 }); await fixture.whenStable();
    const lines = structuredClone(quote.items());
    const configurator = mode === 'ERP' ? fixture.debugElement.query(By.directive(ErpConfigurator)).componentInstance as ErpConfigurator : null;
    if (configurator) configurator.form.patchValue({ quantity: 2.5, material: '19', notes: 'Borrador ERP', measures: { ancho: 2, alto: 3 } });
    else fixture.componentInstance.form.patchValue({ quantity: 7, notes: 'Borrador legacy' });
    await fixture.whenStable();
    const before = configurator?.form.getRawValue() ?? fixture.componentInstance.form.getRawValue();
    const revised: Product = { ...structuredClone(product), name: 'Título actualizado', seoTitle: 'SEO actualizado' };
    if (revised.configuration) revised.configuration.configurationVersion = '5';
    updates.next(revised); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toBe('Título actualizado');
    expect(document.title).toBe('SEO actualizado');
    if (configurator) expect(fixture.debugElement.query(By.directive(ErpConfigurator)).componentInstance).toBe(configurator);
    expect(configurator?.form.getRawValue() ?? fixture.componentInstance.form.getRawValue()).toEqual(before);
    expect(quote.items()).toEqual(lines);
  });

  it('reports a failed revalidation without unmounting the configurator or losing its draft', async () => {
    const product = erpProduct(); const updates = new BehaviorSubject<Product | undefined>(product);
    const fixture = await setup(product, updates);
    const configurator = fixture.debugElement.query(By.directive(ErpConfigurator)).componentInstance as ErpConfigurator;
    configurator.form.patchValue({ quantity: 2.5, notes: 'Conservar ante error' }); await fixture.whenStable();
    const draft = configurator.form.getRawValue(); updates.error(new Error('API unavailable')); await fixture.whenStable();
    expect(fixture.debugElement.query(By.directive(ErpConfigurator)).componentInstance).toBe(configurator);
    expect(configurator.form.getRawValue()).toEqual(draft);
    expect(fixture.nativeElement.querySelector('[role=alert]')?.textContent).toContain('No pudimos actualizar');
  });

  it('removes the disabled product detail and its indexable SEO while preserving quote lines', async () => {
    const product = erpProduct(); const updates = new BehaviorSubject<Product | undefined>(product);
    const fixture = await setup(product, updates); const quote = TestBed.inject(QuoteStore);
    quote.addItem(PRODUCTS[0], { quantity: 3 }); await fixture.whenStable(); const lines = structuredClone(quote.items());
    updates.next(undefined); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-erp-configurator')).toBeNull();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('no está disponible');
    expect(document.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex,follow');
    expect(quote.items()).toEqual(lines);
  });
});
