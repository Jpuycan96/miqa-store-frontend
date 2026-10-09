import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { QuoteStore } from './quote-store';

@Injectable({ providedIn: 'root' })
export class QuotePresentation {
  readonly productDetail = signal(false);
  readonly catalogPage = signal(false);
  readonly showEmpty = signal(false);
  readonly focusRequested = signal(false);
  private readonly quote = inject(QuoteStore);
  readonly panelVisible = computed(() => this.quote.totalItems() > 0 || this.showEmpty());

  requestPanel() {
    this.showEmpty.set(this.quote.totalItems() === 0);
    this.focusRequested.set(true);
  }

  dismissEmpty() { this.showEmpty.set(false); this.focusRequested.set(false); }

  constructor() {
    effect(() => { if (this.quote.totalItems()) this.showEmpty.set(false); });
  }
}
