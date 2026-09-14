import { afterNextRender, ChangeDetectionStrategy, Component, computed, DOCUMENT, ElementRef, inject, input, OnDestroy, output, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Product } from '../../../shared/models/product';
import { QuoteStore } from '../../../core/quote/quote-store';
import { calculateArea, createQuoteItem } from '../../../core/quote/quote-utils';

@Component({
  selector: 'app-area-configurator', imports: [ReactiveFormsModule],
  templateUrl: './area-configurator.html', styleUrl: './area-configurator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AreaConfigurator implements OnDestroy {
  readonly product = input.required<Product>();
  readonly dismissed = output<void>();
  private readonly quote = inject(QuoteStore);
  private readonly document = inject(DOCUMENT);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private returnFocus: HTMLElement | null = null;
  private previousOverflow = '';
  private locked = false;
  private scrollPosition = { left: 0, top: 0 };
  readonly form = new FormGroup({
    width: new FormControl<number | null>(null), height: new FormControl<number | null>(null),
    material: new FormControl('', { nonNullable: true }), notes: new FormControl('', { nonNullable: true })
  });
  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly area = computed(() => calculateArea(this.values().width ?? 0, this.values().height ?? 0));
  readonly configuration = computed(() => ({ quantity: this.product().minQuantity ?? 1,
    widthMeters: this.values().width ?? undefined, heightMeters: this.values().height ?? undefined,
    materialId: this.values().material, notes: this.values().notes }));
  readonly canAdd = computed(() => !!createQuoteItem(this.product(), this.configuration(), 'preview'));

  constructor() {
    afterNextRender(() => {
      this.returnFocus = this.document.activeElement as HTMLElement | null;
      this.scrollPosition = { left: this.document.defaultView?.scrollX ?? 0, top: this.document.defaultView?.scrollY ?? 0 };
      this.previousOverflow = this.document.body.style.overflow;
      this.document.body.style.overflow = 'hidden';
      this.locked = true;
      this.dialog().nativeElement.showModal();
    });
  }
  add() { if (this.quote.addItem(this.product(), this.configuration())) this.close(); }
  close() { this.dialog().nativeElement.close(); this.dismissed.emit(); }
  backdrop(event: MouseEvent) {
    if (event.target !== this.dialog().nativeElement) return;
    const rect = this.dialog().nativeElement.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.close();
  }
  ngOnDestroy() {
    if (this.locked) this.document.body.style.overflow = this.previousOverflow;
    if (this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
    if (this.locked) this.document.defaultView?.scrollTo({ ...this.scrollPosition, behavior: 'instant' });
  }
}
