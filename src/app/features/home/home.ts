import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Seo } from '../../core/seo/seo';
import { Header } from '../../core/header/header';
import { Footer } from '../../core/footer/footer';
import { Hero } from './hero/hero';
import { Categories } from './categories/categories';
import { FeaturedProducts } from './featured-products/featured-products';
import { FEATURED_PRODUCTS } from './featured-products/featured-products.mock';
import { Services } from './services/services';
import { Projects } from './projects/projects';
import { ContactCta } from './contact-cta/contact-cta';
@Component({
 selector: 'app-home', imports: [Header, Footer, Hero, Categories, FeaturedProducts, Services, Projects, ContactCta],
 template: `
  <a class="skip-link" href="#contenido">Saltar al contenido</a>
  <app-header />
  <main id="contenido" tabindex="-1">
   <app-hero />
   <app-categories [query]="query()" (explore)="openNotice($event, info)" />
   <app-featured-products [products]="products" />
   <app-services />
   <app-projects />
   <app-contact-cta />
  </main>
  <app-footer />
  <dialog #info aria-labelledby="notice-title" aria-describedby="notice-text">
   <h2 id="notice-title">{{ noticeTitle() }}</h2>
   <p id="notice-text">{{ noticeText() }}</p>
   <form method="dialog"><button class="primary-button">Entendido <span aria-hidden="true">↗</span></button></form>
  </dialog>
 `,
 changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home {
 readonly products = FEATURED_PRODUCTS;
 readonly query = signal('');
 readonly noticeTitle = signal('');
 readonly noticeText = signal('');
 constructor() {
  inject(Seo).apply('/');
 }
 openNotice(title: string, dialog: HTMLDialogElement) {
  this.noticeTitle.set(title);
  this.noticeText.set('Estamos preparando esta sección. Pronto encontrarás aquí más detalles sobre nuestras soluciones gráficas.');
  dialog.showModal();
 }
}
