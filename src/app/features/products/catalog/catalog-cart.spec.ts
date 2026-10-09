import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { Catalog } from './catalog';
import { ProductCatalog } from '../../../core/data/product-catalog';
import { PublicPricing } from '../../../core/data/public-pricing';
import { QuoteStore } from '../../../core/quote/quote-store';
import { erpProduct } from '../../../testing/erp.fixture';
import { PRODUCTS } from '../../../core/data/products.mock';

const unique = structuredClone(erpProduct('ESCALA'));
unique.configuration!.configuration!.materiales = [unique.configuration!.configuration!.materiales[0]];

describe('Catalog always opens the product configurator', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  afterEach(() => { TestBed.resetTestingModule(); localStorage.clear(); sessionStorage.clear(); });
  it.each([unique, { ...unique, configuration: { ...unique.configuration!, mode: 'UNAVAILABLE' as const } }, erpProduct('M2'), erpProduct('METRO_LINEAL'), erpProduct('ESCALA'), ...PRODUCTS])('opens $name without adding, reloading or evaluating from the card', async product => {
    const evaluate = vi.fn(); const findBySlug = vi.fn();
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: PublicPricing, useValue: { evaluate } },
      { provide: ProductCatalog, useValue: { list: () => of([product]), categories: () => of([]), findBySlug } }
    ] });
    const fixture = TestBed.createComponent(Catalog); await fixture.whenStable();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(fixture.nativeElement.querySelector('.configure')?.textContent).toContain('Agregar al carrito');
    await fixture.componentInstance.addFromCatalog(product);
    expect(navigate).toHaveBeenCalledWith(['/productos', product.slug], { queryParams: { regresar: '/' } });
    expect(TestBed.inject(QuoteStore).items()).toHaveLength(0);
    expect(evaluate).not.toHaveBeenCalled(); expect(findBySlug).not.toHaveBeenCalled();
  });
});
