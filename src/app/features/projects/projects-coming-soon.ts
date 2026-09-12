import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Seo } from '../../core/seo/seo';

@Component({
  selector: 'app-projects-coming-soon',
  template: `
    <main class="page-shell">
      <p class="eyebrow">Proyectos MIQA</p>
      <h1>Estamos preparando nuestro portafolio completo.</h1>
      <a class="primary-button" href="/#proyectos">Volver a la Home <span aria-hidden="true">→</span></a>
    </main>
  `,
  styles: `main { padding-block: 80px; color: var(--miqa-navy); } h1 { max-width: 700px; font-size: clamp(36px, 5vw, 64px); line-height: 1.1; letter-spacing: -.04em; margin-block: 20px 32px; } a { max-width: 100%; }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectsComingSoon {
  constructor() { inject(Seo).apply('/proyectos'); }
}
