import { ProductImageView } from '../../../shared/product-images/product-image';
import { computed } from '@angular/core';
import { Product } from '../../../shared/models/product';
import { productImages } from '../../../shared/product-images/product-images';
import { QuantityInput } from '../../../shared/quantity-input';
import { QuoteSubmit } from '../quote-submit';
import { QuoteSubmission } from '../quote-submission';
import { afterRenderEffect, ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';
import { QuotePresentation } from '../quote-presentation';
import { QuoteStore } from '../quote-store';
import { describeQuoteItem } from '../quote-utils';

@Component({
  imports: [ProductImageView, QuantityInput, QuoteSubmit],
  selector: 'app-quote-panel', templateUrl: './quote-panel.html', styleUrl: './quote-panel.scss',
  host: { '[class.compact]': 'compact()' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuotePanel {
  readonly compact = input(false);
  readonly currentProduct = input<Product>();
  readonly thumbnail = computed(() => {
    const product = this.currentProduct();
    return product ? productImages(product)[0] : undefined;
  });
  imageFor(item: import('../../../shared/models/quote-item').QuoteItem) {
    const product = this.quote.productFor(item);
    return product ? productImages(product)[0]?.url ?? '' : '';
  }
  readonly presentation = inject(QuotePresentation);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  dismissEmpty() {
    this.presentation.dismissEmpty();
    this.element.nativeElement.ownerDocument.querySelector<HTMLButtonElement>('.quote-toggle')?.focus();
  }
  constructor() {
    afterRenderEffect(() => {
      if (!this.presentation.focusRequested()) return;
      this.element.nativeElement.scrollIntoView?.({ block: 'start', behavior: 'auto' });
      this.element.nativeElement.querySelector('h2')?.focus({ preventScroll: true });
      this.presentation.focusRequested.set(false);
    });
  }
  readonly submission = inject(QuoteSubmission);
  readonly quote = inject(QuoteStore);
  readonly describe = describeQuoteItem;
}
