// Read-only subset of the backend Projection / ErpCatalogContract consumed by this UI.
export interface ProductErpBinding {
  productId: string;
  erpServiceId: string;
  active: boolean;
  state: string;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string;
}
