import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Header } from '../../core/header/header';
import { Footer } from '../../core/footer/footer';
import { Seo } from '../../core/seo/seo';

@Component({
  selector: 'app-not-found', imports: [RouterLink, Header, Footer],
  template: `<a class="skip-link" href="#not-found-content">Saltar al contenido</a><app-header />
    <main id="not-found-content" class="page-shell" tabindex="-1"><p class="eyebrow">ERROR 404</p><h1>Esta página no está disponible.</h1><p>El enlace puede haber cambiado o ya no existir.</p><a class="primary-button" routerLink="/">Volver al inicio <span aria-hidden="true">→</span></a></main><app-footer />`,
  styles: `main{padding-block:80px;color:var(--miqa-navy)}h1{max-width:700px;margin-block:16px;font-size:clamp(34px,5vw,58px);line-height:1.1;letter-spacing:-.04em}p:not(.eyebrow){margin-bottom:28px;color:var(--muted);line-height:1.6}`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFound {
  constructor(){inject(Seo).applyPage('/pagina-no-encontrada',{title:'Página no encontrada | MIQA',description:'La página solicitada no está disponible.',robots:'noindex,nofollow'});}
}
