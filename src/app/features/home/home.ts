import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Header } from '../../core/header/header';
import { Hero } from './hero/hero';
import { Categories } from './categories/categories';
import { FeaturedProducts } from './featured-products/featured-products';
import { FEATURED_PRODUCTS } from './featured-products/featured-products.mock';
@Component({
 selector: 'app-home', imports: [Header, Hero, Categories, FeaturedProducts],
 template: `
  <a class="skip-link" href="#contenido">Saltar al contenido</a>
  <app-header (searchChange)="query.set($event)" (notice)="openNotice($event, info)" />
  <main id="contenido" tabindex="-1">
   <app-hero (contact)="openNotice('Hablemos de tu proyecto', info)" />
   <app-categories [query]="query()" (explore)="openNotice($event, info)" />
   <app-featured-products [products]="products" />
  </main>
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
  inject(Title).setTitle('MIQA Soluciones Gráficas | Impresión y Publicidad');
  inject(Meta).updateTag({ name: 'description', content: 'Soluciones gráficas, impresión, letreros, señalética y publicidad para empresas y negocios.' });
 }
 openNotice(title: string, dialog: HTMLDialogElement) {
  this.noticeTitle.set(title);
  this.noticeText.set(title === 'Hablemos de tu proyecto'
   ? 'Pronto podrás conversar con el equipo MIQA por WhatsApp. Nuestro canal de contacto todavía no está habilitado.'
   : 'Estamos preparando esta sección. Pronto encontrarás aquí más detalles sobre nuestras soluciones gráficas.');
  dialog.showModal();
 }
}
