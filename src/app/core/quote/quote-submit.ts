import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { QuoteSubmission } from './quote-submission';

@Component({
  selector: 'app-quote-submit', imports: [ReactiveFormsModule],
  templateUrl: './quote-submit.html', styleUrl: './quote-submit.scss',
  host: { '[class.compact]': 'compact()' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuoteSubmit {
  readonly compact = input(false);
  readonly submission = inject(QuoteSubmission);
  readonly confirmedMessage = computed(() => {
    const confirmed = this.submission.confirmed();
    if (!confirmed) return '';
    try { return new URL(confirmed.url).searchParams.get('text') ?? ''; }
    catch { return ''; }
  });
}
