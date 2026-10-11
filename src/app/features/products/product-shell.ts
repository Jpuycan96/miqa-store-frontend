import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../core/header/header';
import { Footer } from '../../core/footer/footer';
import { CatalogHandoff } from '../../core/seo/catalog-handoff';

@Component({
  selector: 'app-product-shell',
  imports: [Header, Footer, RouterOutlet],
  template: `<nav class="skip-navigation" aria-label="Acceso al contenido"><a class="skip-link" href="#catalog-content">Saltar al contenido</a></nav>
    <app-header [catalogMode]="true" />
    <div id="catalog-content" tabindex="-1" [attr.role]="handoff.visible() ? 'region' : 'main'"
      [attr.aria-label]="handoff.visible() ? 'Estado de la aplicación' : null"><router-outlet /></div>
    <app-footer />`,
  styles: `.skip-navigation { position: absolute; }
  @media (min-width: 1280px) {
    :host:has(app-product-detail) { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100dvh; }
    :host:has(app-product-detail) #catalog-content { min-height: 0; }
    :host:has(app-product-detail) > app-footer { display: none; }
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductShell { readonly handoff = inject(CatalogHandoff); }
