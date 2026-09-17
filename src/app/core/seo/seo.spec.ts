import { provideTestCatalog } from '../../testing/catalog.fixture';
import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { PAGE_SEO } from './seo';
import { PRODUCT_CATEGORIES } from '../data/products.mock';

beforeEach(() => TestBed.configureTestingModule({ providers: [provideTestCatalog()] }));

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
        'meta[property="og:type"]': 'website',
        'meta[property="og:site_name"]': 'MIQA',
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
  it('makes catalog variants noindex with one clean canonical and keeps JSON-LD unique', async()=>{
    TestBed.configureTestingModule({providers:[provideRouter(routes)]});const harness=await RouterTestingHarness.create('/productos');const document=TestBed.inject(DOCUMENT);
    expect(document.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('index,follow');
    for(const url of ['/productos?buscar=vinil','/productos?categoria=impresion','/productos?categoria=impresion&buscar=vinil']){
      await harness.navigateByUrl(url);expect(document.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex,follow');expect(document.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe('https://store.solucionesmicaela.com/productos');expect(document.querySelectorAll('script[data-miqa-seo-jsonld]')).toHaveLength(1);
    }
  });
  it('applies category SEO, canonical and three-level BreadcrumbList to all category pages',async()=>{
    TestBed.configureTestingModule({providers:[provideRouter(routes)]});
    const harness=await RouterTestingHarness.create('/productos/impresion-gran-formato');
    const document=TestBed.inject(DOCUMENT);
    for(const category of PRODUCT_CATEGORIES){
      await harness.navigateByUrl(`/productos/${category.slug}`);
      expect(document.title).toBe(`${category.name} en Trujillo | MIQA`);
      expect(document.querySelector('meta[name=description]')?.getAttribute('content')).toContain(category.catalogDescription);
      expect(document.querySelector('meta[name=description]')?.getAttribute('content')).toContain('Trujillo');
      expect(document.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('index,follow');
      expect(document.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe(`https://store.solucionesmicaela.com/productos/${category.slug}`);
      expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(`https://store.solucionesmicaela.com/productos/${category.slug}`);
      const data=JSON.parse(document.querySelector('script[data-miqa-seo-jsonld]')!.textContent!);
      expect(data['@type']).toBe('BreadcrumbList');
      expect(data.itemListElement.map((item:{name:string})=>item.name)).toEqual(['Inicio','Productos',category.name]);
      expect(document.body.textContent).not.toContain('"@type":"Product"');
    }
    await harness.navigateByUrl('/productos/merchandising?buscar=lapicero');
    expect(document.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex,follow');
    expect(document.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe('https://store.solucionesmicaela.com/productos/merchandising');
  });
  it('marks unknown routes noindex nofollow without using the home canonical',async()=>{
    TestBed.configureTestingModule({providers:[provideRouter(routes)]});await RouterTestingHarness.create('/no-existe');const document=TestBed.inject(DOCUMENT);
    expect(document.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex,nofollow');expect(document.querySelector('link[rel=canonical]')?.getAttribute('href')).not.toBe('https://store.solucionesmicaela.com/');
  });
});
