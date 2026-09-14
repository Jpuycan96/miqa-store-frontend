import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

@Component({
  selector: 'app-product-image',
  imports: [NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (available()) {
      <img [ngSrc]="src()" [alt]="alt()" fill [priority]="priority()" [sizes]="sizes()" (error)="failed.set(src())">
    } @else {
      <span class="fallback" role="img" [attr.aria-label]="'Imagen no disponible: ' + alt()">
        <svg aria-hidden="true" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="7" width="38" height="34" rx="4"/><circle cx="17" cy="18" r="4"/><path d="m7 35 11-10 9 8 6-6 8 8"/></svg>
        <span>Imagen no disponible</span>
      </span>
    }
  `,
  styles: `
    :host { display:block; position:relative; width:100%; height:100%; }
    img { object-fit:contain; padding:var(--product-image-padding, 0); scale:var(--product-image-scale, 1); }
    .fallback { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; width:100%; height:100%; min-height:70px; color:#46576a; background:#e2e7e9; font-size:12px; text-align:center; }
    svg { width:40px; height:40px; }
  `
})
export class ProductImageView {
  readonly src = input.required<string>();
  readonly alt = input('');
  readonly priority = input(false);
  readonly sizes = input('100vw');
  readonly failed = signal('');
  readonly available = computed(() => !!this.src() && this.src() !== this.failed());
}
