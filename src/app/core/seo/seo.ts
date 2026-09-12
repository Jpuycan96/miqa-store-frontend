import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export const PAGE_SEO = {
  '/': {
    title: 'MIQA | Impresión, publicidad y soluciones gráficas',
    description: 'Impresión, letreros publicitarios, merchandising, señalética y soluciones gráficas para hacer visible tu marca.',
    robots: 'index,follow'
  },
  '/productos': {
    title: 'Productos | MIQA',
    description: 'Explora las soluciones de impresión, publicidad, señalética, merchandising y producción gráfica de MIQA.',
    robots: 'noindex,follow'
  },
  '/proyectos': {
    title: 'Proyectos | MIQA',
    description: 'Conoce proyectos de impresión, señalética, letreros e implementación desarrollados por MIQA.',
    robots: 'noindex,follow'
  }
} as const;

@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  apply(path: keyof typeof PAGE_SEO): void {
    this.applyPage(path, PAGE_SEO[path]);
  }

  applyPage(path: string, page: { title: string; description: string; robots: string }): void {
    const url = `https://store.solucionesmicaela.com${path}`;
    this.title.setTitle(page.title);
    for (const [name, content] of Object.entries({
      description: page.description, robots: page.robots,
      'twitter:card': 'summary', 'twitter:title': page.title, 'twitter:description': page.description
    })) this.meta.updateTag({ name, content });
    for (const [property, content] of Object.entries({
      'og:title': page.title, 'og:description': page.description, 'og:type': 'website', 'og:url': url
    })) this.meta.updateTag({ property, content });
    const canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?? this.document.head.appendChild(this.document.createElement('link'));
    canonical.rel = 'canonical';
    canonical.href = url;
  }
}
