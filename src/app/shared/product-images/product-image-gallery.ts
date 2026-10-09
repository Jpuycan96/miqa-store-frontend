import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, signal, viewChildren } from '@angular/core';
import { ImageSource, productImages } from './product-images';
import { ProductImageView } from './product-image';

@Component({
  selector: 'app-product-image-gallery', imports: [ProductImageView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gallery" [class.has-thumbnails]="images().length > 1">
      @if (images().length > 1) {
        <div class="thumbnails" role="group" aria-label="Elegir imagen del producto" (keydown)="onKey($event)">
          @for (image of images(); track image.id; let i = $index) {
            <button #thumbnail type="button" [attr.aria-label]="'Ver imagen ' + (i + 1) + ' de ' + images().length" [attr.aria-pressed]="i === index()" (click)="selected.set(i)">
              <app-product-image [src]="image.url" [alt]="image.altText || product().name" sizes="6vw" />
            </button>
          }
        </div>
      }
      <div class="main-image"><app-product-image [src]="active()?.url ?? ''" [alt]="active()?.altText || product().name" [priority]="priority()" [sizes]="sizes()" /></div>
    </div>
  `,
  styles: `
    :host { display:block; position:relative; width:100%; height:100%; }
    .gallery { display:grid; height:100%; min-height:0; grid-template-rows:minmax(0,1fr); }
    .gallery.has-thumbnails { grid-template-rows:minmax(0,1fr) 64px; gap:8px; }
    .main-image { min-width:0; min-height:0; }
    .thumbnails { grid-row:2; display:flex; gap:6px; overflow:auto; }
    .thumbnails button { flex-shrink:0; width:64px; height:64px; border:2px solid transparent; padding:2px; border-radius:6px; background:white; cursor:pointer; }
    .thumbnails [aria-pressed=true] { border-color:#087e8a; }
    button:focus-visible { outline:3px solid #075b87; outline-offset:-3px; }
    @media (min-width:768px) {
      .gallery.has-thumbnails { grid-template-columns:64px minmax(0,1fr); grid-template-rows:minmax(0,1fr); }
      .thumbnails { grid-row:1; flex-direction:column; }
    }
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
  private readonly thumbnails = viewChildren<ElementRef<HTMLButtonElement>>('thumbnail');
  constructor() { effect(() => { this.product(); this.selected.set(0); }); }
  onKey(event: KeyboardEvent) {
    const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const count = this.images().length;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1
      : (this.index() + (event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1) + count) % count;
    this.selected.set(next); this.thumbnails()[next]?.nativeElement.focus();
  }
}
