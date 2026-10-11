import { isPlatformBrowser } from '@angular/common';
import { afterNextRender, DOCUMENT, DestroyRef, inject, Injectable, Injector, PLATFORM_ID, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const CATALOG_PATH = /^\/productos\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/;

/** Owns only the Worker's direct body child, never Angular's rendered tree. */
@Injectable({ providedIn: 'root' })
export class CatalogHandoff {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly destroy = inject(DestroyRef);
  private readonly initial = this.findInitial();
  private readonly present = signal(!!this.initial);
  readonly visible = this.present.asReadonly();

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationEnd && !CATALOG_PATH.test(event.urlAfterRedirects.split('?')[0])) {
        afterNextRender(() => {
          if (this.router.url === event.urlAfterRedirects) this.complete(event.urlAfterRedirects);
        }, { injector: this.injector });
      }
    });
  }

  private findInitial(): HTMLElement | null {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return null;
    const node = this.document.getElementById('miqa-catalog-seo');
    if (!node || node.tagName !== 'MAIN' || node.parentElement !== this.document.body
      || !node.hasAttribute('data-miqa-catalog-seo')) return null;
    try {
      const canonical = new URL(node.getAttribute('data-miqa-canonical') ?? '');
      if (canonical.origin !== 'https://store.solucionesmicaela.com' || canonical.search || canonical.hash
        || canonical.username || canonical.password || !CATALOG_PATH.test(canonical.pathname)
        || canonical.pathname !== this.document.location.pathname.replace(/\/$/, '')) return null;
    } catch { return null; }
    return node;
  }

  /** Call only from a render callback after current public data has settled successfully. */
  complete(path: string): void {
    if (!this.present() || !this.initial?.isConnected
      || this.router.url.split('?')[0].replace(/\/$/, '') !== path.split('?')[0].replace(/\/$/, '')) return;
    const hadFocus = this.initial.contains(this.document.activeElement);
    this.initial.remove();
    this.present.set(false);
    if (hadFocus) {
      // The existing shell main is already focusable. No attributes or content in app-root are changed.
      afterNextRender(() => {
        if (!this.destroy.destroyed && this.router.url.split('?')[0] === path.split('?')[0]
          && this.document.activeElement === this.document.body) {
          const target = this.document.querySelector<HTMLElement>('app-root #catalog-content')
            ?? this.document.querySelector<HTMLElement>('app-root a[href]');
          target?.focus({ preventScroll: true });
        }
      }, { injector: this.injector });
    }
  }

  temporaryError(): void {
    if (!this.present() || !this.initial?.isConnected) return;
    if (this.initial.querySelector('[data-miqa-catalog-status]')) return;
    const notice = this.document.createElement('p');
    notice.setAttribute('data-miqa-catalog-status', '');
    notice.setAttribute('role', 'status');
    notice.textContent = 'Información temporal: no pudimos confirmar los datos actuales. Puedes reintentar en la aplicación.';
    this.initial.prepend(notice);
  }
}
