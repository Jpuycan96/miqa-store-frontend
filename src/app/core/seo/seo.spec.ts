import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { PAGE_SEO } from './seo';

describe('Route SEO', () => {
  it('updates unique canonical and social metadata and restores indexability on returning home', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const harness = await RouterTestingHarness.create('/');
    const document = TestBed.inject(DOCUMENT);
    for (const path of ['/', '/productos', '/proyectos', '/'] as const) {
      await harness.navigateByUrl(path);
      const page = PAGE_SEO[path];
      expect(document.title).toBe(page.title);
      const expected: Record<string, string> = {
        'meta[name="description"]': page.description,
        'meta[name="robots"]': page.robots,
        'meta[property="og:title"]': page.title,
        'meta[property="og:description"]': page.description,
        'meta[property="og:url"]': `https://store.solucionesmicaela.com${path}`,
        'meta[name="twitter:title"]': page.title,
        'meta[name="twitter:description"]': page.description
      };
      for (const [selector, content] of Object.entries(expected)) {
        expect(document.querySelectorAll(selector).length).toBe(1);
        expect(document.querySelector(selector)?.getAttribute('content')).toBe(content);
      }
      expect(document.querySelectorAll('link[rel="canonical"]').length).toBe(1);
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href'))
        .toBe(`https://store.solucionesmicaela.com${path}`);
    }
  });
});
