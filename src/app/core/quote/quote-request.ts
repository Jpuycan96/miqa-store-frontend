import { QuoteItem } from '../../shared/models/quote-item';

export interface QuoteContact { name: string; phone: string; email?: string; }
export interface QuoteRequestItem {
  productId: string;
  saleType?: QuoteItem['saleType'];
  erp?: import('../../shared/models/erp-configuration').ErpSelection;
  quantity: number;
  packSize?: number;
  widthMeters?: number;
  heightMeters?: number;
  materialId?: string;
  extraIds: string[];
  notes?: string;
}
export interface QuoteRequest { schemaVersion?: 2; contact: QuoteContact; notes?: string; items: QuoteRequestItem[]; }
export interface QuoteReceipt { reference: string; receivedAt: string; confirmation: string; }

/** Only selection IDs and input values are sent; catalog labels and calculations belong to the API. */
export function quoteRequest(items: readonly QuoteItem[], contact: QuoteContact, notes: string): QuoteRequest {
  return {
    ...(items.some(item => item.erp) ? { schemaVersion: 2 as const } : {}),
    contact: { name: contact.name.trim(), phone: contact.phone.trim(), ...(contact.email?.trim() ? { email: contact.email.trim() } : {}) },
    ...(notes.trim() ? { notes: notes.trim() } : {}),
    items: items.map(item => item.erp ? ({
      productId: item.productId, quantity: item.quantity, extraIds: [], notes: item.notes,
      erp: { erpServiceId: item.erp.erpServiceId, catalogRevision: item.erp.catalogRevision,
        configurationVersion: item.erp.configurationVersion, erpMaterialId: item.erp.erpMaterialId,
        erpModelId: item.erp.erpModelId, measures: { ...item.erp.measures } }
    }) : ({
      productId: item.productId, saleType: item.saleType, quantity: item.quantity,
      ...(item.saleType === 'PACK' ? { packSize: item.packSize } : {}),
      ...(item.saleType === 'AREA' ? { widthMeters: item.widthMeters, heightMeters: item.heightMeters } : {}),
      ...(item.selectedMaterial ? { materialId: item.selectedMaterial.id } : {}),
      extraIds: [...new Set(item.selectedExtras?.map(extra => extra.id) ?? [])].sort(),
      ...(item.notes ? { notes: item.notes } : {})
    }))
  };
}

export function requestLimitError(request: QuoteRequest): string {
  if (!request.items.length || request.items.length > 50) return 'Envía entre 1 y 50 productos por solicitud.';
  for (const item of request.items) {
    if (item.erp) {
      if (request.schemaVersion !== 2 || !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 1e9)
        return 'Revisa la cantidad del producto configurado.';
      if (Object.values(item.erp.measures).some(value => !Number.isFinite(value) || value < 0.01 || value > 1000))
        return 'Revisa las medidas del producto configurado.';
      continue;
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 1_000_000_000)
      return 'Revisa la cantidad de los productos. Usa cantidades enteras y respeta el mínimo indicado.';
    if (item.saleType === 'AREA' && [item.widthMeters, item.heightMeters].some(value =>
      value === undefined || !Number.isFinite(value) || value < 0.01 || value > 1000 || Math.abs(value * 1e6 - Math.round(value * 1e6)) > 0.000001))
      return 'Revisa las medidas de los productos e ingrésalas en metros.';
  }
  if (new TextEncoder().encode(JSON.stringify(request)).length > 65536) return 'La solicitud es demasiado extensa. Reduce productos o notas.';
  return '';
}
