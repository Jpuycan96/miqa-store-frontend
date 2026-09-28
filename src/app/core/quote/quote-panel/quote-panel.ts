import { QuantityInput } from '../../../shared/quantity-input';
import { QuoteSubmit } from '../quote-submit';
import { QuoteSubmission } from '../quote-submission';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { QuoteStore } from '../quote-store';
import { describeQuoteItem } from '../quote-utils';

@Component({
  imports: [QuantityInput, QuoteSubmit],
  selector: 'app-quote-panel', templateUrl: './quote-panel.html', styleUrl: './quote-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuotePanel {
  readonly submission = inject(QuoteSubmission);
  readonly quote = inject(QuoteStore);
  readonly describe = describeQuoteItem;
}
