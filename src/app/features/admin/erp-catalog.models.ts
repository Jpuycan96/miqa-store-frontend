// Read-only subset of the backend Projection / ErpCatalogContract consumed by this UI.
export interface ErpServiceProjection {
  erpServiceId: string;
  available: boolean;
  syncState: string;
  lastSyncedAt: string;
  lastKnownErp: {
    nombreReferencia: string;
    categoria: { erpCategoryId: string; nombreReferencia: string };
    configuracion: { formaCotizacion: string };
  };
}
export interface ProductErpBinding {
  productId: string;
  erpServiceId: string;
  active: boolean;
  state: string;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string;
}
export interface ErpBindingInput {
  erpServiceId: string;
  active: boolean;
}
export interface ErpSyncStatus {
  outcome: string; attemptedAt: string | null; succeededAt: string | null;
  received: number; changed: number; missing: number;
}
