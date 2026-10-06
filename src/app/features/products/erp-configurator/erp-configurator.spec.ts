import { TestBed } from '@angular/core/testing';
import { PublicPricing } from '../../../core/data/public-pricing';
import { of } from 'rxjs';
import { ProductCatalog } from '../../../core/data/product-catalog';
import { QuoteStore } from '../../../core/quote/quote-store';
import { erpProduct } from '../../../testing/erp.fixture';
import { ErpConfigurator } from './erp-configurator';

describe('Public ERP configurator', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({providers: [{provide: PublicPricing, useValue: {evaluate: () => of({status: 'QUOTE_REQUIRED'})}}, {provide: ProductCatalog,useValue: {list: () => of([])}}]});
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
    expect(fixture.componentInstance.canAdd()).toBe(form === 'ESCALA');
    expect(fixture.componentInstance.form.getRawValue()).toMatchObject({ quantity: 0.5, material: '10', model: '20' });
    fixture.componentInstance.form.controls.material.setValue('10');
    await fixture.whenStable();
    fixture.componentInstance.form.controls.model.setValue('20');
    fixture.componentInstance.form.controls.quantity.setValue(1.5);
    for(const field of fixture.componentInstance.fields()) fixture.componentInstance.form.controls.measures.controls[field].setValue(2.5);
    await fixture.whenStable();
    expect(fixture.componentInstance.canAdd()).toBe(true);
    el.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    expect(TestBed.inject(QuoteStore).items()[0].erp?.erpMaterialId).toBe('10');
    expect(TestBed.inject(QuoteStore).items()[0].quantity).toBe(1.5);
    expect(fixture.componentInstance.form.getRawValue()).toMatchObject({ quantity: 0.5, material: '10', model: '20', notes: '' });
    for (const control of Object.values(fixture.componentInstance.form.controls.measures.controls)) expect(control.value).toBeNull();
    expect(el.textContent).not.toContain('catalogRevision');
    fixture.componentInstance.form.controls.material.setValue('19');
    await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.model.value).toBe('');
    expect(el.querySelector('#erp-model')).toBeNull();
  });
  it('shows M2 materials/models as single-choice radios and preserves their IDs', async () => {
    const fixture = TestBed.createComponent(ErpConfigurator);
    fixture.componentRef.setInput('product', erpProduct());
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('select')).toBeNull();
    const materials = el.querySelectorAll<HTMLInputElement>('input[formcontrolname=material]');
    expect(materials).toHaveLength(2);
    materials[0].click(); await fixture.whenStable();
    const model = el.querySelector<HTMLInputElement>('input[formcontrolname=model]')!;
    expect(model.type).toBe('radio'); model.click(); await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.model.value).toBe('20');
    materials[1].click(); await fixture.whenStable();
    expect(materials[0].checked).toBe(false);
    expect(materials[1].checked).toBe(true);
    expect(fixture.componentInstance.form.controls.material.value).toBe('19');
    expect(fixture.componentInstance.form.controls.model.value).toBe('');
    expect(el.querySelector('input[formcontrolname=model]')).toBeNull();
  });
  it('steps quantity with the configured increment and preserves min/max and invalid drafts', async () => {
    const fixture = TestBed.createComponent(ErpConfigurator);
    fixture.componentRef.setInput('product', erpProduct()); await fixture.whenStable();
    const component = fixture.componentInstance;
    const el: HTMLElement = fixture.nativeElement;
    const minus = el.querySelector<HTMLButtonElement>('[aria-label="Reducir cantidad"]')!;
    const plus = el.querySelector<HTMLButtonElement>('[aria-label="Aumentar cantidad"]')!;
    expect(component.form.controls.quantity.value).toBe(0.5);
    component.form.controls.quantity.setValue(0.5); await fixture.whenStable();
    expect(minus.disabled).toBe(true);
    plus.click(); await fixture.whenStable();
    expect(component.form.controls.quantity.value).toBe(1.5);
    minus.click(); await fixture.whenStable();
    expect(component.form.controls.quantity.value).toBe(0.5);
    component.form.controls.quantity.setValue(100); await fixture.whenStable();
    expect(plus.disabled).toBe(true);
    component.form.controls.quantity.setValue(null); await fixture.whenStable();
    expect(plus.disabled).toBe(true); expect(minus.disabled).toBe(true);
    expect(component.form.controls.quantity.value).toBeNull();
  });
  it('uses the suggested increment when no mandatory multiple exists', async () => {
    const product = erpProduct('ESCALA');
    product.configuration!.configuration!.cantidad = { ...product.configuration!.configuration!.cantidad,
      minimo: '1', multiploObligatorio: null, incrementoSugerido: '2' };
    const fixture = TestBed.createComponent(ErpConfigurator);
    fixture.componentRef.setInput('product', product); await fixture.whenStable();
    fixture.componentInstance.stepQuantity(1);
    expect(fixture.componentInstance.form.controls.quantity.value).toBe(3);
  });
  it.each(['M2', 'ESCALA', 'METRO_LINEAL'] as const)('uses the same visible material radios for %s', async mode => {
    const product = erpProduct(mode);
    if (mode === 'ESCALA') product.configuration!.configuration!.materiales = [
      { erpMaterialId: 'arbitrary-material', nombreReferencia: 'Llavero Destapador', modoModelos: 'SIN_MODELO', modelos: [] }
    ];
    const fixture = TestBed.createComponent(ErpConfigurator);
    fixture.componentRef.setInput('product', product); await fixture.whenStable();
    const radios = fixture.nativeElement.querySelectorAll('.material-options input[type=radio]');
    expect(radios.length).toBe(product.configuration!.configuration!.materiales.length);
    expect(radios[0].checked).toBe(true);
    expect(fixture.nativeElement.querySelector('select[formcontrolname=material]')).toBeNull();
  });
  it('starts/reset at ERP minimum, steps by increment, and accepts manual quantities without a multiple', async () => {
    const product = erpProduct('ESCALA');
    product.configuration!.configuration!.cantidad = { unidad: 'unidades', minimo: '50', incrementoSugerido: '50',
      multiploObligatorio: null, permiteDecimales: false, precision: 0, maximo: '1000' };
    const fixture = TestBed.createComponent(ErpConfigurator);
    fixture.componentRef.setInput('product', product); await fixture.whenStable();
    const component = fixture.componentInstance;
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#erp-quantity');
    expect(input.value).toBe('50');
    for (const [direction, expected] of [[1,100],[1,150],[-1,100],[-1,50],[-1,50]] as const) {
      component.stepQuantity(direction); await fixture.whenStable();
      expect(component.form.controls.quantity.value).toBe(expected);
    }
    for (const quantity of [75,120,500]) {
      input.value = String(quantity); input.dispatchEvent(new Event('input')); await fixture.whenStable();
      expect(component.canAdd()).toBe(true);
      expect(component.form.controls.quantity.value).toBe(quantity);
      expect(component.form.controls.material.value).toBe('10');
      expect(component.form.controls.model.value).toBe('20');
      expect(fixture.nativeElement.textContent).not.toContain('Actualizar opciones');
    }
    input.value = '75'; input.dispatchEvent(new Event('input')); await fixture.whenStable();
    component.stepQuantity(-1); await fixture.whenStable();
    expect(component.form.controls.quantity.value).toBe(50);
    component.form.controls.quantity.setValue(75); await fixture.whenStable();
    component.add(); await fixture.whenStable();
    expect(TestBed.inject(QuoteStore).items()[0].quantity).toBe(75);
    expect(component.form.controls.quantity.value).toBe(50);
    const revised = structuredClone(product);
    revised.configuration!.configuration!.cantidad.multiploObligatorio = '50';
    fixture.componentRef.setInput('product', revised); await fixture.whenStable();
    component.form.controls.quantity.setValue(75); await fixture.whenStable();
    expect(component.canAdd()).toBe(false);
    expect(component.steppedQuantity(1)).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Actualizar opciones');
  });
  it('preserves valid quantity, options, measures and notes when ERP revisions refresh', async () => {
    const product = erpProduct();
    const fixture = TestBed.createComponent(ErpConfigurator);
    fixture.componentRef.setInput('product', product); await fixture.whenStable();
    const component = fixture.componentInstance;
    component.form.patchValue({quantity: 2.5, material: '19', notes: 'Conservar', measures: {ancho: 2, alto: 3}});
    await fixture.whenStable();
    const revised = structuredClone(product); revised.configuration!.configurationVersion = '5';
    fixture.componentRef.setInput('product', revised); await fixture.whenStable();
    expect(component.form.getRawValue()).toEqual({quantity: 2.5, material: '19', model: '', notes: 'Conservar', measures: {ancho: 2, alto: 3}});
    expect(component.selection().erp.configurationVersion).toBe('5');
    expect(component.canAdd()).toBe(true);
    revised.configuration!.configuration!.materiales = [revised.configuration!.configuration!.materiales[0]];
    fixture.componentRef.setInput('product', structuredClone(revised)); await fixture.whenStable();
    expect(component.form.controls.material.value).toBe('10');
    expect(component.form.controls.model.value).toBe('20');
    expect(component.form.controls.quantity.value).toBe(2.5);
  });

  it.each(['ESCALA', 'M2', 'METRO_LINEAL'] as const)('places quantity below material/model options and retains measures for %s', async mode => {
    const fixture = TestBed.createComponent(ErpConfigurator);
    fixture.componentRef.setInput('product', erpProduct(mode)); await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const columns = el.querySelector('.configuration-fields')!;
    expect(columns.querySelector('.measures') !== null).toBe(mode !== 'ESCALA');
    expect(columns.querySelector('.option-fields')).not.toBeNull();
    expect(el.querySelectorAll('#erp-quantity')).toHaveLength(1);
    expect(columns.querySelector('#erp-quantity')).toBeNull();
    expect(el.querySelector('.quantity-price #erp-quantity')).not.toBeNull();
    const lower = el.querySelector('.quantity-price')!;
    expect(lower.children[0].classList.contains('quantity-field')).toBe(true);
    expect(lower.children[1].classList.contains('pricing')).toBe(true);
    expect(el.querySelector('form')!.classList.contains('without-measures')).toBe(mode === 'ESCALA');
    const choices = columns.querySelectorAll('.material-options .choice-list > .choice');
    expect(choices).toHaveLength(2);
    for (const choice of choices) expect(choice.querySelector('input[type=radio]')).not.toBeNull();
  });
  it('uses the increment for buttons while independently enforcing a mandatory multiple', async () => {
    const product = erpProduct('ESCALA');
    product.configuration!.configuration!.cantidad = {unidad: 'unidades', minimo: '50', incrementoSugerido: '100',
      multiploObligatorio: '50', permiteDecimales: false, precision: 0, maximo: '1000'};
    const fixture = TestBed.createComponent(ErpConfigurator);
    fixture.componentRef.setInput('product', product); await fixture.whenStable();
    fixture.componentInstance.stepQuantity(1); await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.quantity.value).toBe(150);
    fixture.componentInstance.form.controls.quantity.setValue(75); await fixture.whenStable();
    expect(fixture.componentInstance.canAdd()).toBe(false);
  });

  it.each(['M2', 'ESCALA', 'METRO_LINEAL'] as const)('renders ERP model cards with the existing selection and form state for %s', async mode => {
    const product = erpProduct(mode);
    product.configuration!.configuration!.materiales[0].modelos = [
      { erpModelId: 'model-a', nombreReferencia: 'Modelo A' },
      { erpModelId: 'model-b', nombreReferencia: 'Modelo B' },
      { erpModelId: 'model-c', nombreReferencia: 'Modelo C' }
    ];
    const fixture = TestBed.createComponent(ErpConfigurator);
    fixture.componentRef.setInput('product', product); await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('select')).toBeNull();
    expect(el.querySelector('.model-options legend')?.textContent).toBe('Modelo');
    const cards = el.querySelectorAll<HTMLLabelElement>('.model-card');
    const radios = el.querySelectorAll<HTMLInputElement>('.model-card input[type=radio]');
    expect(cards).toHaveLength(3);
    expect(Array.from(cards, card => card.textContent?.trim())).toEqual(['Modelo A', 'Modelo B', 'Modelo C']);
    expect(radios[0].checked).toBe(true);
    expect(radios[1].checked).toBe(false);
    expect(radios[0].name).toBe(radios[1].name);
    expect(radios[0].name).not.toBe('');
    fixture.componentInstance.form.controls.quantity.setValue(2.5);
    cards[1].click(); await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.model.value).toBe('model-b');
    expect(radios[0].checked).toBe(false);
    expect(radios[1].checked).toBe(true);
    expect(fixture.componentInstance.form.controls.quantity.value).toBe(2.5);
    expect(fixture.componentInstance.form.controls.material.value).toBe('10');
    el.querySelectorAll<HTMLInputElement>('.material-options input')[1].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.model.value).toBe('');
    expect(el.querySelector('.model-options')).toBeNull();
  });
  it('renders a fixed single model as a selected card', async () => {
    const product = erpProduct('ESCALA');
    product.configuration!.configuration!.materiales[0].modoModelos = 'FIJO';
    const fixture = TestBed.createComponent(ErpConfigurator);
    fixture.componentRef.setInput('product', product); await fixture.whenStable();
    const radios = fixture.nativeElement.querySelectorAll('.model-card input');
    expect(radios).toHaveLength(1);
    expect(radios[0].checked).toBe(true);
    expect(fixture.componentInstance.form.controls.model.value).toBe('20');
  });
  it('does not render an empty model fieldset for a contract without model options', async () => {
    const product = erpProduct('ESCALA');
    product.configuration!.configuration!.materiales = [{
      erpMaterialId: 'only-material', nombreReferencia: 'Material', modoModelos: 'SELECCION', modelos: []
    }];
    const fixture = TestBed.createComponent(ErpConfigurator);
    fixture.componentRef.setInput('product', product); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.model-options')).toBeNull();
    expect(fixture.componentInstance.canAdd()).toBe(false);
  });

  it('hides empty material/model sections without removing quantity', async () => {
    const product = erpProduct('ESCALA');
    product.configuration!.configuration!.materiales = [];
    const fixture = TestBed.createComponent(ErpConfigurator);
    fixture.componentRef.setInput('product', product); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.material-options')).toBeNull();
    expect(fixture.nativeElement.querySelector('.model-options')).toBeNull();
    expect(fixture.nativeElement.querySelector('#erp-quantity')).not.toBeNull();
  });

});
