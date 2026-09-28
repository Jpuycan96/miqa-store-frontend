import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { QuoteSubmission } from './quote-submission';

@Component({
  selector: 'app-quote-submit', imports: [ReactiveFormsModule],
  templateUrl: './quote-submit.html', styleUrl: './quote-submit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuoteSubmit { readonly submission = inject(QuoteSubmission); }
