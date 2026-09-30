import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { FormControl, FormGroup, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
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
  readonly quote = inject(QuoteStore);
  readonly number = Number;
  readonly labels: Record<string, string> = { ancho: 'Ancho', alto: 'Alto', longitud: 'Longitud' };
  readonly config = computed(() => this.product().configuration?.configuration);
  readonly fields = computed(() => this.config()?.medidas.camposRequeridos.filter(field => field !== 'cantidad') ?? []);
  readonly form = new FormGroup({
    quantity: new FormControl<number | null>(null),
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
  readonly canAdd = computed(() => !!createQuoteItem(this.product(), this.selection(), 'preview'));
  constructor() {
    effect(() => {
      const config = this.config();
      for (const key of Object.keys(this.form.controls.measures.controls)) this.form.controls.measures.removeControl(key);
      for (const field of this.fields()) this.form.controls.measures.addControl(field, new FormControl<number | null>(null));
      const rules = config?.cantidad;
      const minimum = Number(rules?.minimo ?? 1);
      const multiple = Number(rules?.multiploObligatorio);
      const quantity = multiple ? Math.round(Math.ceil(minimum / multiple) * multiple * 1e6) / 1e6 : minimum;
      this.form.reset({ quantity, material: config?.modoMaterial === 'FIJO' ? config.materiales[0].erpMaterialId : '', model: '', notes: '' });
    });
    effect(() => {
      const material = this.material();
      this.form.controls.model.setValue(material?.modoModelos === 'FIJO' ? material.modelos[0].erpModelId : '');
    });
  }
  add() { if (this.canAdd()) this.quote.addItem(this.product(), this.selection()); }
}
