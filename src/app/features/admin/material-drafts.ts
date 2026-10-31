import { HttpErrorResponse } from '@angular/common/http';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin, TimeoutError } from 'rxjs';
import { AdminApi, adminError } from './admin-api';
import type { AdminCategory } from './admin.models';
import type { ErpServiceProjection, MaterialDraft, MaterialDraftBatch } from './erp-catalog.models';
import type { ErpMaterial } from '../../shared/models/erp-configuration';

type MaterialRow = FormGroup<{
  erpMaterialId: FormControl<string>; selected: FormControl<boolean>;
  erpModelId: FormControl<string>; name: FormControl<string>;
}>;
@Component({
  selector: 'app-admin-material-drafts', imports: [ReactiveFormsModule],
  templateUrl: './material-drafts.html', styleUrls: ['./admin.scss', './material-drafts.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminMaterialDrafts {
  private readonly api = inject(AdminApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly heading = viewChild<ElementRef<HTMLHeadingElement>>('heading');
  readonly closed = output<void>();
  readonly created = output<MaterialDraft[]>();
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly completed = signal(false);
  readonly error = signal('');
  readonly services = signal<ErpServiceProjection[]>([]);
  readonly categories = signal<AdminCategory[]>([]);
  readonly form = new FormGroup({
    serviceId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    materials: new FormArray<MaterialRow>([])
  });
  readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly rows = this.form.controls.materials;
  readonly selectedRows = computed(() => { this.values(); return this.rows.controls.filter(row => row.controls.selected.value); });
  readonly selectedService = computed(() => this.services().find(service => service.erpServiceId === this.values().serviceId));
  readonly summary = computed(() => this.selectedRows().map(row => {
    const material = this.materialFor(row);
    const model = material?.modelos.find(model => model.erpModelId === row.controls.erpModelId.value);
    return { id: row.controls.erpMaterialId.value, material: material?.nombreReferencia ?? 'Material no disponible',
      model: model?.nombreReferencia ?? '', name: row.controls.name.value.trim()
        || (material?.nombreReferencia ?? '') + (model ? ' - ' + model.nombreReferencia : '') };
  }));
  readonly categoryName = computed(() => this.categories().find(category => category.id === this.values().categoryId)?.name ?? 'Selecciona una categoría');
  readonly canSubmit = computed(() => {
    this.values();
    return !this.loading() && !this.busy() && !this.completed() && this.buildRequest() !== null;
  });
  constructor() {
    this.form.controls.serviceId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.resetRows());
    afterNextRender(() => this.heading()?.nativeElement.focus());
    this.load();
  }
  load(): void {
    if (this.busy()) return;
    this.loading.set(true); this.error.set(''); this.services.set([]); this.categories.set([]);
    this.rows.clear(); this.form.controls.serviceId.setValue(''); this.form.controls.categoryId.setValue('');
    forkJoin({ services: this.api.erpServices(), categories: this.api.categories() })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({ next: result => {
        this.services.set(result.services.filter(service => this.available(service)));
        this.categories.set(result.categories.filter(category => category.active));
      }, error: error => this.error.set('No se pudo cargar el catálogo administrativo. ' + adminError(error)) });
  }
  private available(service: ErpServiceProjection): boolean {
    const source = service.lastKnownErp;
    return service.available && service.syncState === 'AVAILABLE' && source?.erpServiceId === service.erpServiceId
      && source.contractVersion === 1 && source.elegible && source.disponible && source.estadoConfiguracion === 'CONFIGURADA'
      && !!source.configuracion?.materiales.length;
  }
  private resetRows(): void {
    this.rows.clear(); this.error.set('');
    const service = this.services().find(service => service.erpServiceId === this.form.controls.serviceId.value);
    for (const material of service?.lastKnownErp?.configuracion?.materiales ?? []) {
      this.rows.push(new FormGroup({
        erpMaterialId: new FormControl(material.erpMaterialId, { nonNullable: true }),
        selected: new FormControl(false, { nonNullable: true }),
        erpModelId: new FormControl('', { nonNullable: true }),
        name: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] })
      }));
    }
  }
  materialFor(row: MaterialRow): ErpMaterial | undefined {
    const service = this.services().find(service => service.erpServiceId === this.form.controls.serviceId.value);
    return service?.lastKnownErp?.configuracion?.materiales.find(material => material.erpMaterialId === row.controls.erpMaterialId.value);
  }
  select(row: MaterialRow, event: Event): void {
    if (this.busy()) return;
    const selected = (event.target as HTMLInputElement).checked;
    if (selected && !row.controls.selected.value && this.selectedRows().length >= 50) return;
    row.controls.selected.setValue(selected);
    if (!selected) { row.controls.erpModelId.setValue(''); row.controls.name.setValue(''); }
  }
  buildRequest(): MaterialDraftBatch | null {
    const service = this.services().find(service => service.erpServiceId === this.form.controls.serviceId.value);
    const selected = this.rows.controls.filter(row => row.controls.selected.value);
    if (!service || !this.available(service) || selected.length < 1 || selected.length > 50
        || !this.categories().some(category => category.active && category.id === this.form.controls.categoryId.value)) return null;
    const ids = new Set<string>();
    for (const row of selected) {
      const material = this.materialFor(row);
      if (!material || ids.has(material.erpMaterialId) || !row.controls.name.valid
          || row.controls.erpModelId.value && !material.modelos.some(model => model.erpModelId === row.controls.erpModelId.value)) return null;
      ids.add(material.erpMaterialId);
    }
    return { categoryId: this.form.controls.categoryId.value, materials: selected.map(row => ({
      erpMaterialId: row.controls.erpMaterialId.value, erpModelId: row.controls.erpModelId.value || null,
      name: row.controls.name.value.trim() || null
    })) };
  }
  submit(): void {
    if (this.busy() || this.completed()) return;
    const request = this.buildRequest();
    if (!request) { this.form.markAllAsTouched(); this.error.set('Selecciona una categoría activa y entre 1 y 50 materiales con modelos válidos.'); return; }
    this.busy.set(true); this.error.set('');
    this.api.createMaterialDrafts(this.form.controls.serviceId.value, request)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false)))
      .subscribe({ next: drafts => { this.completed.set(true); this.created.emit(drafts); }, error: error => this.error.set(draftError(error)) });
  }
  close(): void { if (!this.busy()) this.closed.emit(); }
}
function draftError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const code = typeof error.error?.message === 'string' ? error.error.message : '';
    if (error.status === 409) return code === 'DUPLICATE_SELECTION'
      ? 'Ya existe un producto para una de estas selecciones, incluso si está desactivado. Revisa la lista; no se creó otro lote.'
      : 'El catálogo está ocupado o existe un conflicto. Revisa los productos y vuelve a intentarlo.';
    if (error.status === 422) return 'El servicio, material o modelo ya no está aprobado o disponible. Actualiza los servicios y revisa la seleccion.';
    if (error.status === 404) return 'El servicio o la categoría ya no está disponible. Actualiza los servicios y revisa la categoría.';
    if (error.status === 0) return 'No se pudo confirmar la creación. Revisa la lista de productos antes de volver a enviar.';
  }
  if (error instanceof TimeoutError) return 'No se pudo confirmar la creación. Revisa la lista de productos antes de volver a enviar.';
  return adminError(error);
}
