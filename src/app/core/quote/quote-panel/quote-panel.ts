import { ProductImageView } from '../../../shared/product-images/product-image';
import { Router, RouterLink } from '@angular/router';
import { formatPen } from '../../data/public-pricing';
import { computed } from '@angular/core';
import { Product } from '../../../shared/models/product';
import { productImages } from '../../../shared/product-images/product-images';
import { QuantityInput } from '../../../shared/quantity-input';
import { QuoteSubmit } from '../quote-submit';
import { QuoteSubmission } from '../quote-submission';
import { afterRenderEffect, ChangeDetectionStrategy, Component, DestroyRef, effect, ElementRef, inject, input, untracked, viewChild } from '@angular/core';
import { QuotePresentation } from '../quote-presentation';
import { QuoteStore } from '../quote-store';
import { describeQuoteItem } from '../quote-utils';

@Component({
  imports: [RouterLink, ProductImageView, QuantityInput, QuoteSubmit],
  selector: 'app-quote-panel', templateUrl: './quote-panel.html', styleUrl: './quote-panel.scss',
  host: { '[class.compact]': 'compact()', '[class.lateral]': 'presentation.lateral()' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuotePanel {
  private readonly router = inject(Router);
  catalogOrigin() {
    return this.presentation.catalogPage() ? this.router.url
      : this.router.parseUrl(this.router.url).queryParams['regresar'] ?? '/productos';
  }
  readonly formatPrice = formatPen;
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
  private readonly surface = viewChild<ElementRef<HTMLDialogElement>>('surface');
  private previousFocus?: HTMLElement;
  private previousOverflow = '';
  private locked = false;
  closeSide() { this.presentation.sideOpen.set(false); if (!this.quote.totalItems()) this.presentation.dismissEmpty(); }
  cancel(event: Event) { event.preventDefault(); this.closeSide(); }
  backdrop(event: MouseEvent) {
    const dialog = this.surface()?.nativeElement;
    if (event.target !== dialog || !dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.closeSide();
  }
  private release() {
    if (!this.locked) return;
    this.surface()?.nativeElement.close();
    this.element.nativeElement.ownerDocument.body.style.overflow = this.previousOverflow;
    this.locked = false;
    const target = this.previousFocus?.isConnected ? this.previousFocus : this.element.nativeElement.querySelector<HTMLButtonElement>('.quote-tab');
    target?.focus({ preventScroll: true });
  }
  constructor() {
    effect(() => { this.quote.items(); untracked(() => this.quote.refreshPrices()); });
    inject(DestroyRef).onDestroy(() => { this.quote.stopPrices(); this.release(); });
    afterRenderEffect(() => {
      const dialog = this.surface()?.nativeElement;
      if (!dialog) return;
      const lateral = this.presentation.lateral();
      const open = this.presentation.sideOpen();
      if (lateral && open && !this.locked) {
        const document = this.element.nativeElement.ownerDocument;
        this.previousFocus = this.presentation.opener ?? document.activeElement as HTMLElement;
        this.previousOverflow = document.body.style.overflow;
        dialog.removeAttribute('open');
        dialog.showModal();
        document.body.style.overflow = 'hidden';
        this.locked = true;
      } else if (!lateral || !open) {
        this.release();
        if (!lateral) dialog.setAttribute('open', '');
      }
      if (!this.presentation.focusRequested() || (lateral && !open)) return;
      if (!lateral) this.element.nativeElement.scrollIntoView?.({ block: 'start', behavior: 'auto' });
      dialog.querySelector('h2')?.focus({ preventScroll: true });
      this.presentation.focusRequested.set(false);
    });
  }
  readonly submission = inject(QuoteSubmission);
  readonly quote = inject(QuoteStore);
  readonly describe = describeQuoteItem;
}
