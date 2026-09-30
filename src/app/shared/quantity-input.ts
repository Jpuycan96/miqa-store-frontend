import { Directive, ElementRef, effect, inject, input, output } from '@angular/core';
import { normalizeQuantity } from '../core/quote/quote-utils';
import { ErpQuantity, validErpQuantity } from './models/erp-configuration';

/** Keep the raw draft visible while only emitting valid quantities to application state. */
@Directive({
  selector: 'input[appQuantityInput]',
  host: {
    'type': 'number', '[attr.inputmode]': "erpRules()?.permiteDecimales ? 'decimal' : 'numeric'",
    '[attr.step]': "erpRules()?.permiteDecimales ? 'any' : '1'",
    '[attr.min]': 'minimum()',
    '(input)': 'edit()', '(blur)': 'commit()',
    '(keydown.enter)': '$event.preventDefault(); commit()'
  }
})
export class QuantityInput {
  readonly quantity = input.required<number>();
  readonly minimum = input(1);
  readonly erpRules = input<ErpQuantity>();
  readonly quantityChange = output<number>();
  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private editing = false;

  constructor() {
    effect(() => {
      const value = this.quantity();
      if (!this.editing) this.element.nativeElement.value = String(value);
    });
  }

  edit() {
    this.editing = true;
    this.quantityChange.emit(this.normalize(this.element.nativeElement.valueAsNumber));
  }

  commit() {
    const value = this.normalize(this.element.nativeElement.valueAsNumber);
    this.editing = false;
    this.element.nativeElement.value = String(value);
    this.quantityChange.emit(value);
  }
  private normalize(value: number): number {
    const rules = this.erpRules();
    return rules ? (validErpQuantity(value, rules) ? value : this.quantity()) : normalizeQuantity(value, this.minimum());
  }
}
