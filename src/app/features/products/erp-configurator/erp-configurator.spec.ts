import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProductCatalog } from '../../../core/data/product-catalog';
import { QuoteStore } from '../../../core/quote/quote-store';
import { erpProduct } from '../../../testing/erp.fixture';
import { ErpConfigurator } from './erp-configurator';

describe('Public ERP configurator', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({providers: [{provide: ProductCatalog,useValue: {list: () => of([])}}]});
  });
  afterEach(() => localStorage.clear());
  it.each(['M2','ESCALA','METRO_LINEAL'] as const)('renders %s contract fields and adds approved options', async form => {
    const fixture = TestBed.createComponent(ErpConfigurator);
    fixture.componentRef.setInput('product',erpProduct(form));
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#erp-ancho') !== null).toBe(form === 'M2');
    expect(el.querySelector('#erp-alto') !== null).toBe(form === 'M2');
    expect(el.querySelector('#erp-longitud') !== null).toBe(form === 'METRO_LINEAL');
    expect(fixture.componentInstance.canAdd()).toBe(false);
    fixture.componentInstance.form.controls.material.setValue('10');
    await fixture.whenStable();
    fixture.componentInstance.form.controls.model.setValue('20');
    fixture.componentInstance.form.controls.quantity.setValue(1.5);
    for(const field of fixture.componentInstance.fields()) fixture.componentInstance.form.controls.measures.controls[field].setValue(2.5);
    await fixture.whenStable();
    expect(fixture.componentInstance.canAdd()).toBe(true);
    el.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    expect(TestBed.inject(QuoteStore).items()[0].erp?.erpMaterialId).toBe('10');
    expect(el.textContent).not.toContain('catalogRevision');
    fixture.componentInstance.form.controls.material.setValue('19');
    await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.model.value).toBe('');
    expect(el.querySelector('#erp-model')).toBeNull();
  });
});
