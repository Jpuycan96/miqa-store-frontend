import { ChangeDetectionStrategy, Component, computed, inject, input, signal, ElementRef, effect } from '@angular/core';
import { QuoteStore } from './quote-store';
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
  readonly showClear = input(false);
  readonly contactOpen = signal(false);
  readonly quote = inject(QuoteStore);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  submit() {
    if (!this.submission.pending() && this.submission.form.invalid) {
      this.contactOpen.set(true);
      this.submission.form.markAllAsTouched();
      setTimeout(() => this.element.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
    }
    this.submission.submit();
  }
  readonly submission = inject(QuoteSubmission);
  constructor() {
    effect(() => { if (this.submission.error()) this.contactOpen.set(true); });
  }
  readonly confirmedMessage = computed(() => {
    const confirmed = this.submission.confirmed();
    if (!confirmed) return '';
    try { return new URL(confirmed.url).searchParams.get('text') ?? ''; }
    catch { return ''; }
  });
}
