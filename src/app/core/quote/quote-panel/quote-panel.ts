import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { QuoteStore } from '../quote-store';
import { describeQuoteItem } from '../quote-utils';

@Component({
  selector: 'app-quote-panel', templateUrl: './quote-panel.html', styleUrl: './quote-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuotePanel {
  readonly quote = inject(QuoteStore);
  readonly describe = describeQuoteItem;
}
