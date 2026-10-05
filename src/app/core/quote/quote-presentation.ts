import { afterNextRender, computed, DestroyRef, DOCUMENT, inject, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class QuotePresentation {
  readonly productDetail = signal(false);
  private readonly desktop = signal(false);
  readonly integrated = computed(() => this.productDetail() && this.desktop());

  constructor() {
    const document = inject(DOCUMENT);
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const media = document.defaultView?.matchMedia('(min-width: 1120px)');
      if (!media) return;
      const update = () => this.desktop.set(media.matches);
      update();
      media.addEventListener('change', update);
      destroy.onDestroy(() => media.removeEventListener('change', update));
    });
  }
}
