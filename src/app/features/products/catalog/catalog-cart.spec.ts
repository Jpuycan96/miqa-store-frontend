import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { Catalog } from './catalog';
import { ProductCatalog } from '../../../core/data/product-catalog';
import { PublicPricing, PricingResult } from '../../../core/data/public-pricing';
import { QuoteStore } from '../../../core/quote/quote-store';
import { directErpSelection } from '../../../core/quote/erp-quote';
import { erpProduct } from '../../../testing/erp.fixture';

function uniqueProduct() {
  const product = structuredClone(erpProduct('ESCALA'));
  product.configuration!.configuration!.materiales = [product.configuration!.configuration!.materiales[0]];
  return product;
}

describe('Safe catalog cart actions', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  afterEach(() => { TestBed.resetTestingModule(); localStorage.clear(); sessionStorage.clear(); });

  it('only infers complete, published configurations with a valid ERP minimum', () => {
    const product = uniqueProduct();
    expect(directErpSelection(product)?.quantity).toBe(0.5);
    expect(directErpSelection(erpProduct('ESCALA'))).toBeNull();
    expect(directErpSelection(erpProduct('M2'))).toBeNull();
    expect(directErpSelection(erpProduct('METRO_LINEAL'))).toBeNull();
    expect(directErpSelection({ ...product, published: false })).toBeNull();
    product.configuration!.configuration!.cantidad.minimo = '0.3';
    expect(directErpSelection(product)).toBeNull();
  });

  it('rejects multiple models, missing revisions and unknown measure requirements', () => {
    const product = uniqueProduct();
    const material = product.configuration!.configuration!.materiales[0];
    material.modelos = [...material.modelos, { erpModelId: 'other', nombreReferencia: 'Otro' }];
    expect(directErpSelection(product)).toBeNull();
    material.modelos = material.modelos.slice(0, 1);
    product.configuration!.catalogRevision = null;
    expect(directErpSelection(product)).toBeNull();
    product.configuration!.catalogRevision = 'revision';
    product.configuration!.configuration!.medidas.camposRequeridos = ['required-option'];
    expect(directErpSelection(product)).toBeNull();
  });

  it('supports a material without a required model', () => {
    const product = uniqueProduct();
    product.configuration!.configuration!.materiales = [erpProduct('ESCALA').configuration!.configuration!.materiales[1]];
    expect(directErpSelection(product)?.erp?.erpModelId).toBeUndefined();
    expect(directErpSelection(product)).not.toBeNull();
  });

  async function setup(result: PricingResult, fresh = uniqueProduct()) {
    const evaluate = vi.fn(() => of(result));
    const findBySlug = vi.fn(() => of(fresh));
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: PublicPricing, useValue: { evaluate } },
      { provide: ProductCatalog, useValue: { list: () => of([fresh]), categories: () => of([]), findBySlug } }
    ] });
    const fixture = TestBed.createComponent(Catalog);
    await fixture.whenStable();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    return { fixture, navigate, evaluate, findBySlug, store: TestBed.inject(QuoteStore) };
  }

  it('reloads and evaluates before adding, and renders the matching thumbnail', async () => {
    const product = { ...uniqueProduct(), image: '/images/product-specific.png', images: [] };
    const { fixture, navigate, evaluate, findBySlug, store } = await setup({ status: 'PRICE_AVAILABLE', amount: '12.00', includesIgv: true }, product);
    await fixture.componentInstance.addFromCatalog(product);
    await fixture.whenStable();
    expect(findBySlug).toHaveBeenCalledWith(product.slug);
    expect(evaluate).toHaveBeenCalledWith({ productId: product.id, quantity: 0.5, erpMaterialId: '10', erpModelId: '20', measures: {} });
    expect(store.items()).toHaveLength(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-quote-panel img')?.getAttribute('src')).toBe(product.image);
  });

  it.each(['CONFIGURATION_STALE', 'CONFIGURATION_INVALID', 'QUOTE_REQUIRED', 'TEMPORARILY_UNAVAILABLE'] as const)('opens the configurator when pricing returns %s', async status => {
    const { fixture, navigate, store } = await setup({ status });
    await fixture.componentInstance.addFromCatalog(uniqueProduct());
    expect(store.items()).toHaveLength(0);
    expect(navigate).toHaveBeenCalled();
  });

  it('opens the configurator if refreshed options became ambiguous', async () => {
    const { fixture, navigate, evaluate, store } = await setup({ status: 'PRICE_AVAILABLE', amount: '12', includesIgv: true }, erpProduct('ESCALA'));
    await fixture.componentInstance.addFromCatalog(uniqueProduct());
    expect(evaluate).not.toHaveBeenCalled();
    expect(store.items()).toHaveLength(0);
    expect(navigate).toHaveBeenCalled();
  });

  it('renders the existing placeholder when an added product has no image', async () => {
    const product = { ...uniqueProduct(), image: '', images: [], gallery: [] };
    const { fixture } = await setup({ status: 'PRICE_AVAILABLE', amount: '12', includesIgv: true }, product);
    await fixture.componentInstance.addFromCatalog(product); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-quote-panel .fallback')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-quote-panel img')).toBeNull();
  });

  it('prevents repeated clicks while evaluating and cancels additions after navigation', async () => {
    const { fixture, evaluate, store } = await setup({ status: 'QUOTE_REQUIRED' });
    const response = new Subject<PricingResult>();
    evaluate.mockReturnValue(response);
    const first = fixture.componentInstance.addFromCatalog(uniqueProduct());
    await Promise.resolve();
    await fixture.componentInstance.addFromCatalog(uniqueProduct());
    expect(evaluate).toHaveBeenCalledTimes(1);
    fixture.destroy();
    await first;
    expect(store.items()).toHaveLength(0);
  });
});
