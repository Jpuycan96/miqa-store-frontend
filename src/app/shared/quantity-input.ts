import { Directive, ElementRef, effect, inject, input, output } from '@angular/core';
import { normalizeQuantity } from '../core/quote/quote-utils';

/** Keep the raw draft visible while only emitting valid quantities to application state. */
@Directive({
  selector: 'input[appQuantityInput]',
  host: {
    'type': 'number', 'inputmode': 'numeric', 'step': '1',
    '[attr.min]': 'minimum()',
    '(input)': 'edit()', '(blur)': 'commit()',
    '(keydown.enter)': '$event.preventDefault(); commit()'
  }
})
export class QuantityInput {
  readonly quantity = input.required<number>();
  readonly minimum = input(1);
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
    this.quantityChange.emit(normalizeQuantity(this.element.nativeElement.valueAsNumber, this.minimum()));
  }

  commit() {
    const value = normalizeQuantity(this.element.nativeElement.valueAsNumber, this.minimum());
    this.editing = false;
    this.element.nativeElement.value = String(value);
    this.quantityChange.emit(value);
  }
}
