import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ImageSource, productImages } from './product-images';
import { ProductImageView } from './product-image';
import { ProductImageLightbox } from './product-image-lightbox';

@Component({
  selector: 'app-product-image-gallery', imports: [ProductImageView, ProductImageLightbox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="open-image" [attr.aria-label]="'Ampliar imagen de ' + product().name" aria-haspopup="dialog" [disabled]="!images().length" (click)="open($event)">
      <app-product-image [src]="active()?.url ?? ''" [alt]="active()?.altText || product().name" [priority]="priority()" [sizes]="sizes()" />
    </button>
    @if (images().length > 1) {
      <div class="dots" role="group" aria-label="Elegir imagen del producto">
        @for (image of images(); track image.id; let i = $index) {
          <button type="button" [attr.aria-label]="'Ver imagen ' + (i + 1) + ' de ' + images().length" [attr.aria-pressed]="i === index()" (click)="select(i, $event)"><span></span></button>
        }
      </div>
    }
    @if (opened()) {
      <app-product-image-lightbox [images]="images()" [name]="product().name" [index]="index()" (indexChange)="selected.set($event)" (dismissed)="opened.set(false)" />
    }
  `,
  styles: `
    :host { display:block; position:relative; width:100%; height:100%; }
    .open-image { display:block; width:100%; height:100%; border:0; padding:0; background:transparent; cursor:zoom-in; border-radius:inherit; }
    .open-image:disabled { cursor:default; }
    button:focus-visible { outline:3px solid #087e8a; outline-offset:-4px; }
    .dots { position:absolute; bottom:6px; left:50%; transform:translateX(-50%); display:flex; }
    .dots button { display:grid; place-items:center; width:24px; height:32px; border:0; border-radius:4px; background:transparent; cursor:pointer; padding:0; }
    .dots span { width:8px; height:8px; border-radius:50%; border:2px solid #061b4f; background:#fff; box-shadow:0 0 0 1px #fff; box-sizing:border-box; }
    .dots [aria-pressed=true] span { background:#061b4f; }
  `
})
export class ProductImageGallery {
  readonly product = input.required<ImageSource>();
  readonly priority = input(false);
  readonly sizes = input('100vw');
  readonly images = computed(() => productImages(this.product()));
  readonly selected = signal(0);
  readonly index = computed(() => Math.min(this.selected(), Math.max(0, this.images().length - 1)));
  readonly active = computed(() => this.images().at(this.index()));
  readonly opened = signal(false);
  select(index: number, event: MouseEvent) { event.stopPropagation(); this.selected.set(index); }
  open(event: MouseEvent) { event.stopPropagation(); this.opened.set(true); }
}
