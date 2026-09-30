import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize, forkJoin, of, throwError } from 'rxjs';
import { AdminApi, adminError } from './admin-api';
import { ErpServiceProjection, ProductErpBinding } from './erp-catalog.models';

@Component({
  selector: 'app-product-erp',
  imports: [ReactiveFormsModule],
  templateUrl: './product-erp.html',
  styleUrls: ['./admin.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductErp implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly productId = input.required<string>();
  readonly binding = signal<ProductErpBinding | null>(null);
  readonly services = signal<ErpServiceProjection[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly selection = new FormControl('', { nonNullable: true });
  private readonly selectedId = toSignal(this.selection.valueChanges, { initialValue: '' });
  readonly availableServices = computed(() => this.services().filter(service => this.isAvailable(service)));
  readonly currentService = computed(() => this.services().find(service => service.erpServiceId === this.binding()?.erpServiceId));
  readonly selectedService = computed(() => this.availableServices().find(service => service.erpServiceId === this.selectedId()));
  readonly warning = computed(() => this.binding()?.active &&
    (this.binding()?.state !== 'AVAILABLE' || !this.isAvailable(this.currentService())));
  readonly canSave = computed(() => this.loaded() && !this.loading() && !this.busy() && !!this.selectedService() &&
    (!this.binding()?.active || this.selectedId() !== this.binding()?.erpServiceId));

  ngOnInit() { this.load(); }

  private isAvailable(service: ErpServiceProjection | undefined): boolean {
    return service?.available === true && service.syncState === 'AVAILABLE';
  }

  load() {
    if (this.loading() || this.busy()) return;
    this.loading.set(true);
    this.loaded.set(false);
    this.error.set('');
    this.message.set('');
    forkJoin({
      services: this.api.erpServices(),
      binding: this.api.erpBinding(this.productId()).pipe(catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 404 ? of(null) : throwError(() => error))),
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: ({ services, binding }) => {
        this.services.set(services);
        this.binding.set(binding);
        this.selection.setValue(binding?.active && this.isAvailable(this.currentService()) ? binding.erpServiceId : '');
        this.loaded.set(true);
      },
      error: (error: unknown) => this.error.set(adminError(error)),
    });
  }

  save() {
    if (this.canSave()) this.persist(this.selection.value, true);
  }

  unlink() {
    const binding = this.binding();
    if (this.loaded() && !this.loading() && !this.busy() && binding?.active) this.persist(binding.erpServiceId, false);
  }

  private persist(erpServiceId: string, active: boolean) {
    this.busy.set(true);
    this.selection.disable();
    this.error.set('');
    this.message.set('');
    this.api.saveErpBinding(this.productId(), { erpServiceId, active })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.busy.set(false); this.selection.enable(); }))
      .subscribe({
        next: binding => {
          this.binding.set(binding);
          this.selection.setValue(binding.active && this.isAvailable(this.currentService()) ? binding.erpServiceId : '');
          this.message.set(binding.active ? 'Vínculo ERP guardado.' : 'Vínculo ERP desactivado. Se conserva la referencia.');
        },
        error: (error: unknown) => this.error.set(adminError(error)),
      });
  }
}