import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../core/header/header';
import { Footer } from '../../core/footer/footer';

@Component({
  selector: 'app-product-shell',
  imports: [Header, Footer, RouterOutlet],
  template: `<a class="skip-link" href="#catalog-content">Saltar al contenido</a>
    <app-header [catalogMode]="true" />
    <main id="catalog-content" tabindex="-1"><router-outlet /></main>
    <app-footer />`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductShell {}
