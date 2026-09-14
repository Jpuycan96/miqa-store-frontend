import { afterNextRender, ChangeDetectionStrategy, Component, DOCUMENT, ElementRef, inject, input, OnDestroy, output, viewChild } from '@angular/core';
import { ProductImage } from '../models/product';
import { ProductImageView } from './product-image';

@Component({
  selector: 'app-product-image-lightbox', imports: [ProductImageView],
  templateUrl: './product-image-lightbox.html', styleUrl: './product-image-lightbox.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductImageLightbox implements OnDestroy {
  readonly images = input.required<readonly ProductImage[]>();
  readonly name = input.required<string>();
  readonly index = input(0);
  readonly indexChange = output<number>();
  readonly dismissed = output<void>();
  private readonly document = inject(DOCUMENT);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');
  private returnFocus: HTMLElement | null = null;
  private previousOverflow = '';
  private locked = false;

  constructor() {
    afterNextRender(() => {
      this.returnFocus = this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
      this.previousOverflow = this.document.body.style.overflow;
      this.document.body.style.overflow = 'hidden';
      this.locked = true;
      this.dialog().nativeElement.showModal();
      this.closeButton().nativeElement.focus({ preventScroll: true });
    });
  }
  move(delta: number) { this.indexChange.emit((this.index() + delta + this.images().length) % this.images().length); }
  keydown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); this.move(event.key === 'ArrowLeft' ? -1 : 1);
    } else if (event.key === 'Escape') { event.preventDefault(); this.close(); }
  }
  backdrop(event: MouseEvent) { if (event.target === this.dialog().nativeElement) this.close(); }
  close() { this.dialog().nativeElement.close(); this.dismissed.emit(); }
  ngOnDestroy() {
    if (this.locked) this.document.body.style.overflow = this.previousOverflow;
    if (this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
  }
}
