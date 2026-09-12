import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Seo } from '../../core/seo/seo';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-products-coming-soon',
  imports: [RouterLink],
  template: `
    <main class="page-shell">
      <p class="eyebrow">Productos MIQA</p>
      <h1>Estamos preparando nuestro catálogo.</h1>
      <p>Mientras tanto, descubre los favoritos de nuestros clientes en la Home.</p>
      <a class="primary-button" routerLink="/" fragment="productos-destacados">Volver a los productos destacados <span aria-hidden="true">→</span></a>
    </main>
  `,
  styles: `main { padding-block: 80px; color: var(--miqa-navy); } h1 { max-width: 700px; font-size: clamp(36px, 5vw, 64px); line-height: 1.1; letter-spacing: -.04em; margin-block: 20px; } main > p:not(.eyebrow) { max-width: 500px; line-height: 1.7; margin-bottom: 32px; } a { max-width: 100%; }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsComingSoon {
  constructor() { inject(Seo).apply('/productos'); }
}
