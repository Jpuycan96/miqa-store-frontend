import { afterNextRender, computed, DestroyRef, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { QuoteStore } from './quote-store';

@Injectable({ providedIn: 'root' })
export class QuotePresentation {
  readonly productDetail = signal(false);
  readonly catalogPage = signal(false);
  readonly showEmpty = signal(false);
  readonly focusRequested = signal(false);
  readonly lateral = signal(false);
  readonly sideOpen = signal(false);
  private readonly document = inject(DOCUMENT);
  opener?: HTMLElement;
  private readonly quote = inject(QuoteStore);
  readonly panelVisible = computed(() => this.quote.totalItems() > 0 || this.showEmpty());

  requestPanel() {
    this.opener = this.document.activeElement as HTMLElement;
    this.showEmpty.set(this.quote.totalItems() === 0);
    this.focusRequested.set(true);
    this.sideOpen.set(true);
  }

  dismissEmpty() { this.showEmpty.set(false); this.focusRequested.set(false); this.sideOpen.set(false); }

  constructor() {
    const document = inject(DOCUMENT);
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const media = document.defaultView?.matchMedia?.('(max-width: 1279px)');
      if (!media) return;
      const update = () => { this.lateral.set(media.matches); this.sideOpen.set(false); };
      update(); media.addEventListener('change', update);
      destroy.onDestroy(() => media.removeEventListener('change', update));
    });
    effect(() => {
      if (this.quote.totalItems()) this.showEmpty.set(false);
      else if (!this.showEmpty()) this.sideOpen.set(false);
    });
  }
}
