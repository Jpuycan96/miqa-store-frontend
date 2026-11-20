import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, finalize, forkJoin } from 'rxjs';
import { AdminApi, adminError } from './admin-api';
import type { AdminCategory } from './admin.models';
import type { ErpServiceProjection, MaterialPublication } from './erp-catalog.models';

@Injectable()
export class MaterialDraftCatalog {
  private readonly api = inject(AdminApi);
  private readonly destroyRef = inject(DestroyRef);
  private loaded = false;
  readonly loading = signal(false);
  readonly error = signal('');
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  readonly status = signal('');
  readonly services = signal<ErpServiceProjection[]>([]);
  readonly categories = signal<AdminCategory[]>([]);
  readonly publications = signal<MaterialPublication[]>([]);
  private readonly refreshed = new Subject<void>();
  readonly refreshed$ = this.refreshed.asObservable();

  constructor() {
    this.destroyRef.onDestroy(() => this.dismissStatus());
  }

  dismissStatus(): void {
    clearTimeout(this.toastTimer);
    this.toastTimer = undefined;
    this.status.set('');
  }

  ensureLoaded(): void {
    if (!this.loaded) this.load(false);
  }

  invalidate(): void {
    this.loaded = false;
  }

  load(announce = true): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.dismissStatus();
    forkJoin({ services: this.api.erpServices(), categories: this.api.categories(), publications: this.api.materialPublications() })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: result => {
          this.publications.set(result.publications);
          this.services.set(result.services.filter(service => this.available(service)));
          this.categories.set(result.categories.filter(category => category.active));
          this.loaded = true;
          this.refreshed.next();
          if (announce) {
            this.status.set('Servicios y categorías actualizados.');
            this.toastTimer = setTimeout(() => this.dismissStatus(), 3000);
          }
        },
        error: error => {
          this.loaded = false;
          this.error.set('No se pudo cargar el catálogo administrativo. ' + adminError(error));
        },
      });
  }

  private available(service: ErpServiceProjection): boolean {
    const source = service.lastKnownErp;
    return service.available && service.syncState === 'AVAILABLE' && source?.erpServiceId === service.erpServiceId
      && (source.contractVersion === 1 || source.contractVersion === 2) && source.elegible && source.disponible && source.estadoConfiguracion === 'CONFIGURADA'
      && !!source.configuracion?.materiales.length;
  }
  removePublication(id: string): void {
    this.publications.update(items => items.filter(item => item.productId !== id));
  }
}
