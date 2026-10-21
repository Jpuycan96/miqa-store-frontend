import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { testHttpConfig, testMediaReferences } from './test-http.config';

describe('Local TEST media isolation', () => {
  it('redirects restored PROD media in product, gallery and admin DTOs to the TEST proxy', () => {
    const source = { image: 'https://api-store.solucionesmicaela.com/media/a.png',
      images: [{ url: 'http://api-store.solucionesmicaela.com/media/b.png' }],
      gallery: ['/images/local.png'], published: true, missing: null };
    expect(testMediaReferences(source)).toEqual({ image: '/media/a.png',
      images: [{ url: '/media/b.png' }], gallery: ['/images/local.png'], published: true, missing: null });
    expect(source.image).toBe('https://api-store.solucionesmicaela.com/media/a.png');
  });

  it('keeps auth responses and unrelated URLs unchanged', () => {
    const session = { token: 'test-token', expiresAt: '2026-01-01' };
    expect(testMediaReferences(session)).toEqual(session);
    expect(testMediaReferences('https://api-store.solucionesmicaela.com.evil.test/media/a.png'))
      .toBe('https://api-store.solucionesmicaela.com.evil.test/media/a.png');
  });

  it('applies the adaptation through the development HTTP configuration', () => {
    TestBed.configureTestingModule({ providers: [
      ...testHttpConfig.providers, provideRouter([]), provideHttpClientTesting()
    ] });
    const http = TestBed.inject(HttpTestingController);
    const client = TestBed.inject(HttpClient);
    client.get('/api/public/products').subscribe(body => expect(body).toEqual([{ image: '/media/a.png' }]));
    const request = http.expectOne('/api/public/products');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([{ image: 'https://api-store.solucionesmicaela.com/media/a.png' }]);
    http.verify();
  });
});
