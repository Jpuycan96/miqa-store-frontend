import { ProductImageView } from '../../../shared/product-images/product-image';
import { computed } from '@angular/core';
import { Product } from '../../../shared/models/product';
import { productImages } from '../../../shared/product-images/product-images';
import { QuantityInput } from '../../../shared/quantity-input';
import { QuoteSubmit } from '../quote-submit';
import { QuoteSubmission } from '../quote-submission';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
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
  readonly collapsed = output<void>();
  readonly submission = inject(QuoteSubmission);
  readonly quote = inject(QuoteStore);
  readonly describe = describeQuoteItem;
}
