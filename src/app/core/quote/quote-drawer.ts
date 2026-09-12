import { afterRenderEffect, ChangeDetectionStrategy, Component, DOCUMENT, ElementRef, inject, OnDestroy, viewChild } from '@angular/core';
import { QuoteStore } from './quote-store';
import { describeQuoteItem } from './quote-utils';

@Component({
  selector: 'app-quote-drawer',
  templateUrl: './quote-drawer.html',
  styleUrl: './quote-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuoteDrawer implements OnDestroy {
  readonly quote = inject(QuoteStore);
  readonly describe = describeQuoteItem;
  private readonly document = inject(DOCUMENT);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('drawer');
  private returnFocus: HTMLElement | null = null;
  private previousOverflow = '';
  private locked = false;

  constructor() {
    afterRenderEffect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.quote.isOpen() && !dialog.open) {
        this.returnFocus = this.document.activeElement as HTMLElement | null;
        this.previousOverflow = this.document.body.style.overflow;
        this.document.body.style.overflow = 'hidden';
        this.locked = true;
        dialog.showModal();
      } else if (!this.quote.isOpen() && dialog.open) {
        dialog.close();
        this.unlock();
        if (this.returnFocus?.isConnected) this.returnFocus.focus();
      }
    });
  }

  close() { this.quote.close(); }
  backdrop(event: MouseEvent) {
    if (event.target !== this.dialog().nativeElement) return;
    const rect = this.dialog().nativeElement.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.close();
  }
  ngOnDestroy() { this.unlock(); }
  private unlock() {
    if (this.locked) this.document.body.style.overflow = this.previousOverflow;
    this.locked = false;
  }
}
