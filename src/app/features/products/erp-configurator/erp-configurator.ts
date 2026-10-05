import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map, merge, of, Subject, switchMap, timer } from 'rxjs';
import { formatPen, PricingRequest, PricingResult, PublicPricing } from '../../../core/data/public-pricing';
import { validErpQuantity } from '../../../shared/models/erp-configuration';
import { Product } from '../../../shared/models/product';
import { QuoteStore } from '../../../core/quote/quote-store';
import { createQuoteItem } from '../../../core/quote/quote-utils';

@Component({
  selector: 'app-erp-configurator', imports: [ReactiveFormsModule],
  templateUrl: './erp-configurator.html', styleUrl: './erp-configurator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErpConfigurator {
  readonly product = input.required<Product>();
  readonly refreshConfiguration = output<void>();
  readonly added = output<void>();
  private readonly pricing = inject(PublicPricing);
  private readonly retryPricing = new Subject<void>();
  private readonly evaluated = signal<{ key: string; result: PricingResult | null }>({ key: '', result: null });
  readonly formatPrice = formatPen;
  readonly quote = inject(QuoteStore);
  readonly number = Number;
  readonly labels: Record<string, string> = { ancho: 'Ancho', alto: 'Alto', longitud: 'Longitud' };
  readonly config = computed(() => this.product().configuration?.configuration);
  readonly fields = computed(() => this.config()?.medidas.camposRequeridos.filter(field => field !== 'cantidad') ?? []);
  readonly form = new FormGroup({
    quantity: new FormControl<number | null>(1),
    material: new FormControl('', { nonNullable: true }),
    model: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    measures: new FormRecord<FormControl<number | null>>({})
  });
  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly material = computed(() => this.config()?.materiales.find(m => m.erpMaterialId === this.values().material));
  readonly selection = computed(() => {
    const binding = this.product().configuration;
    const values = this.values();
    return {
      quantity: values.quantity ?? NaN, notes: values.notes,
      erp: { erpServiceId: binding?.erpServiceId ?? '', catalogRevision: binding?.catalogRevision ?? '',
        configurationVersion: binding?.configurationVersion ?? '', erpMaterialId: values.material ?? '',
        erpModelId: values.model || undefined,
        measures: Object.fromEntries(this.fields().map(field => [field, values.measures?.[field] ?? NaN])) }
    };
  });
  readonly validSelection = computed(() => !!createQuoteItem(this.product(), this.selection(), 'preview'));
  readonly price = computed(() => {
    this.values();
    const request = this.pricingRequest();
    if (!request) return { status: 'IDLE' } as const;
    const evaluated = this.evaluated();
    return evaluated.key === JSON.stringify(request) && evaluated.result
      ? evaluated.result : { status: 'LOADING' } as const;
  });
  readonly canAdd = computed(() => this.validSelection()
    && this.price().status !== 'CONFIGURATION_INVALID' && this.price().status !== 'CONFIGURATION_STALE');

  private pricingRequest(): PricingRequest | null {
    const product = this.product();
    const binding = product.configuration;
    const values = this.form.getRawValue();
    if (binding?.mode !== 'ERP') return null;
    const selection = { quantity: values.quantity ?? NaN, erp: {
      erpServiceId: binding.erpServiceId ?? '', catalogRevision: binding.catalogRevision ?? '',
      configurationVersion: binding.configurationVersion ?? '', erpMaterialId: values.material,
      erpModelId: values.model || undefined,
      measures: Object.fromEntries(Object.entries(values.measures).map(([key, value]) => [key, value ?? NaN]))
    } };
    if (!createQuoteItem(product, selection, 'preview')) return null;
    return { productId: product.id, quantity: selection.quantity, erpMaterialId: values.material,
      erpModelId: values.model || null, measures: selection.erp.measures };
  }

  steppedQuantity(direction: -1 | 1): number | null {
    const rules = this.config()?.cantidad;
    const current = this.values().quantity;
    if (!rules || current == null || !validErpQuantity(current, rules)) return null;
    const step = Number(rules.multiploObligatorio ?? rules.incrementoSugerido);
    const next = Math.max(Number(rules.minimo), Math.round((current + direction * step) * 1e6) / 1e6);
    if (next === current) return null;
    return validErpQuantity(next, rules) ? next : null;
  }

  stepQuantity(direction: -1 | 1) {
    const next = this.steppedQuantity(direction);
    if (next !== null) this.form.controls.quantity.setValue(next);
  }

  private selectedOptions() {
    const current = this.form.getRawValue();
    const materials = this.config()?.materiales.filter(material =>
      material.modoModelos === 'SIN_MODELO' || material.modelos.length > 0) ?? [];
    const material = materials.find(option => option.erpMaterialId === current.material) ?? materials[0];
    const model = material?.modoModelos === 'SIN_MODELO' ? undefined
      : material?.modelos.find(option => option.erpModelId === current.model) ?? material?.modelos[0];
    return { material: material?.erpMaterialId ?? '', model: model?.erpModelId ?? '' };
  }

  retryPrice() { this.retryPricing.next(); }
  constructor() {
    merge(this.form.valueChanges.pipe(
      map(() => JSON.stringify(this.pricingRequest())), distinctUntilChanged()
    ), this.retryPricing).pipe(
      // Cancel the previous HTTP request before waiting for the next input to settle.
      switchMap(() => {
        const request = this.pricingRequest();
        const key = JSON.stringify(request);
        this.evaluated.set({ key, result: null });
        return request ? timer(300).pipe(switchMap(() => this.pricing.evaluate(request)),
          map(result => ({ key, result }))) : of({ key, result: null });
      }), takeUntilDestroyed()
    ).subscribe(state => this.evaluated.set(state));
    let initializedProductId: string | undefined;
    effect(() => {
      const product = this.product();
      const config = this.config();
      const fields = this.fields();
      // Only a new product/configuration may reconcile the form, never a draft edit.
      untracked(() => {
        const current = this.form.getRawValue();
        const preserve = initializedProductId === product.id;
        const options = this.selectedOptions();
        for (const key of Object.keys(this.form.controls.measures.controls)) {
          if (!fields.includes(key)) this.form.controls.measures.removeControl(key, { emitEvent: false });
        }
        for (const field of fields) {
          if (!this.form.controls.measures.contains(field)) {
            this.form.controls.measures.addControl(field, new FormControl<number | null>(null), { emitEvent: false });
          }
        }
        this.form.reset({
          quantity: preserve && current.quantity != null && config && validErpQuantity(current.quantity, config.cantidad)
            ? current.quantity : Number(config?.cantidad.minimo ?? 1),
          ...options, notes: preserve ? current.notes : '',
          measures: Object.fromEntries(fields.map(field => [field, preserve ? current.measures[field] ?? null : null]))
        });
        initializedProductId = product.id;
      });
    });
    effect(() => {
      const material = this.material();
      const current = this.form.controls.model.value;
      const model = material?.modoModelos === 'SIN_MODELO' ? undefined
        : material?.modelos.find(option => option.erpModelId === current) ?? material?.modelos[0];
      if (current !== (model?.erpModelId ?? '')) this.form.controls.model.setValue(model?.erpModelId ?? '');
    });
  }
  add() {
    if (!this.canAdd() || !this.quote.addItem(this.product(), this.selection())) return;
    const { material, model } = this.selectedOptions();
    this.form.reset({
      quantity: Number(this.config()?.cantidad.minimo ?? 1), material, model, notes: '',
      measures: Object.fromEntries(Object.keys(this.form.controls.measures.controls).map(key => [key, null]))
    });
    this.added.emit();
  }
}
