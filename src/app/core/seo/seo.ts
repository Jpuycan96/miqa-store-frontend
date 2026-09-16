import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export const SITE_URL = 'https://store.solucionesmicaela.com';
export const SITE_NAME = 'MIQA';
export const INSTITUTIONAL_IMAGE = `${SITE_URL}/images/brand/logo-miqa3.png`;

export interface SeoPage {
  readonly title: string;
  readonly description: string;
  readonly robots: 'index,follow' | 'noindex,follow' | 'noindex,nofollow';
  readonly type?: 'website' | 'product';
  readonly image?: string;
  readonly imageAlt?: string;
  readonly structuredData?: readonly Record<string, unknown>[];
}

export const PAGE_SEO = {
  '/': {
    title: 'MIQA | Impresión, publicidad y soluciones gráficas',
    description: 'Impresión, letreros publicitarios, merchandising, señalética y soluciones gráficas para hacer visible tu marca.',
    robots: 'index,follow', image: INSTITUTIONAL_IMAGE, imageAlt: 'MIQA'
  },
  '/productos': {
    title: 'Productos | MIQA',
    description: 'Explora las soluciones de impresión, publicidad, señalética, merchandising y producción gráfica de MIQA.',
    robots: 'index,follow', image: INSTITUTIONAL_IMAGE, imageAlt: 'Productos MIQA'
  },
  '/proyectos': {
    title: 'Proyectos | MIQA',
    description: 'Conoce proyectos de impresión, señalética, letreros e implementación desarrollados por MIQA.',
    robots: 'noindex,follow'
  }
} as const satisfies Record<string, SeoPage>;

@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  apply(path: keyof typeof PAGE_SEO): void { this.applyPage(path, PAGE_SEO[path]); }

  applyPage(path: string, page: SeoPage): void {
    const url = absoluteUrl(path);
    const image = page.image ? absoluteUrl(page.image) : '';
    this.title.setTitle(page.title);
    const named: Record<string, string> = {
      description: page.description, robots: page.robots,
      'twitter:card': image ? 'summary_large_image' : 'summary',
      'twitter:title': page.title, 'twitter:description': page.description,
      'twitter:image': image, 'twitter:image:alt': page.imageAlt ?? ''
    };
    const properties: Record<string, string> = {
      'og:title': page.title, 'og:description': page.description,
      'og:type': page.type ?? 'website', 'og:url': url, 'og:site_name': SITE_NAME,
      'og:image': image, 'og:image:alt': page.imageAlt ?? ''
    };
    for (const [name, content] of Object.entries(named)) this.updateNamed(name, content);
    for (const [property, content] of Object.entries(properties)) this.updateProperty(property, content);
    const canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?? this.document.head.appendChild(this.document.createElement('link'));
    canonical.rel = 'canonical'; canonical.href = url;
    this.updateStructuredData(page.structuredData ?? []);
  }

  private updateNamed(name: string, content: string) {
    if (content) this.meta.updateTag({ name, content }); else this.meta.removeTag(`name="${name}"`);
  }
  private updateProperty(property: string, content: string) {
    if (content) this.meta.updateTag({ property, content }); else this.meta.removeTag(`property="${property}"`);
  }
  private updateStructuredData(items: readonly Record<string, unknown>[]) {
    this.document.querySelectorAll('script[data-miqa-seo-jsonld]').forEach(script => script.remove());
    if (!items.length) return;
    const script = this.document.createElement('script');
    script.type = 'application/ld+json'; script.setAttribute('data-miqa-seo-jsonld','');
    script.textContent = JSON.stringify(items.length === 1 ? items[0] : items);
    this.document.head.appendChild(script);
  }
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function breadcrumb(items: readonly { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name, item: absoluteUrl(item.path)
    }))
  };
}

export const MIQA_LOCAL_BUSINESS: Record<string, unknown> = {
  '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'MIQA', url: SITE_URL,
  logo: INSTITUTIONAL_IMAGE, telephone: '+51 957 173 688',
  address: { '@type': 'PostalAddress', streetAddress: 'Av. España Nº1520', addressLocality: 'Trujillo', postalCode: '13007', addressCountry: 'PE' }
};
