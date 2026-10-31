import type { ErpConfiguration } from '../../shared/models/erp-configuration';
// Read-only subset of the backend Projection / ErpCatalogContract consumed by this UI.
export interface ProductErpBinding {
  productId: string;
  erpServiceId: string;
  active: boolean;
  state: string;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
  canonical?: boolean;
  publicationScope?: 'SERVICE' | 'MATERIAL';
  erpMaterialId?: string | null;
  erpModelId?: string | null;
}

export interface ErpTechnicalService {
  contractVersion: number; sourceSystem: string; erpServiceId: string; nombreReferencia: string;
  elegible: boolean; disponible: boolean; estadoConfiguracion: string;
  catalogRevision: string; configurationVersion: string | null; configuracion: ErpConfiguration | null;
}
export interface ErpServiceProjection {
  erpServiceId: string; available: boolean; syncState: string; lastSyncedAt: string | null;
  lastKnownErp: ErpTechnicalService | null;
}
export interface MaterialDraftInput { erpMaterialId: string; erpModelId: string | null; name: string | null; }
export interface MaterialDraftBatch { categoryId: string; materials: MaterialDraftInput[]; }
export interface MaterialDraft {
  productId: string; slug: string; name: string; categoryId: string; published: boolean;
  binding: { publicationScope: 'MATERIAL'; erpServiceId: string; erpMaterialId: string; erpModelId: string | null };
}
