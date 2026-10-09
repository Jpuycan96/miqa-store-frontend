import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { QuoteSubmit } from './quote-submit';
import { QuoteSubmission } from './quote-submission';
import { provideTestCatalog } from '../../testing/catalog.fixture';

describe('Quote contact accordion', () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideTestCatalog(), provideHttpClient(), provideHttpClientTesting()] });
  });
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); localStorage.clear(); sessionStorage.clear(); });

  it('starts closed and preserves values and validation when toggled', async () => {
    const fixture = TestBed.createComponent(QuoteSubmit); await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const toggle = el.querySelector<HTMLButtonElement>('.contact-toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click(); await fixture.whenStable();
    const name = el.querySelector<HTMLInputElement>('[formControlName=name]')!;
    name.value = 'Cliente'; name.dispatchEvent(new Event('input'));
    TestBed.inject(QuoteSubmission).form.controls.name.markAsTouched();
    toggle.click(); await fixture.whenStable(); toggle.click(); await fixture.whenStable();
    expect(name.value).toBe('Cliente');
    expect(TestBed.inject(QuoteSubmission).form.controls.name.touched).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('opens, displays errors and focuses the invalid field without sending', async () => {
    const fixture = TestBed.createComponent(QuoteSubmit); await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    fixture.componentInstance.submit(); await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(el.querySelector('.contact-toggle')?.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('.contact-fields')?.hasAttribute('hidden')).toBe(false);
    expect(el.querySelector('[role=alert]')).toBeTruthy();
    expect(document.activeElement).toBe(el.querySelector('[formControlName=name]'));
    TestBed.inject(HttpTestingController).expectNone(request => request.method === 'POST');
  });
});
