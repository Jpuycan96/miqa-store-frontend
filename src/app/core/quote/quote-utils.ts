import { Product } from '../../shared/models/product';
import { createErpQuoteItem } from './erp-quote';
import { validErpQuantity } from '../../shared/models/erp-configuration';
import { QuoteConfiguration, QuoteItem } from '../../shared/models/quote-item';

/** Configuration identity excludes quantity and the UI row id; JSON avoids delimiter collisions. */
export function getQuoteItemIdentity(item: QuoteItem): string {
  if (item.erp) return JSON.stringify([item.productId, 'ERP', item.erp.erpServiceId, item.erp.catalogRevision,
    item.erp.configurationVersion, item.erp.erpMaterialId, item.erp.erpModelId ?? null,
    Object.entries(item.erp.measures).sort(([a], [b]) => a.localeCompare(b)), item.notes?.trim() ?? '']);
  return JSON.stringify([
    item.productId, item.saleType, item.unitLabel, item.packSize ?? null, item.packLabel ?? null,
    item.selectedMaterial?.id ?? null,
    [...new Set(item.selectedExtras?.map(extra => extra.id) ?? [])].sort(),
    item.saleType === 'AREA' ? item.widthMeters : null,
    item.saleType === 'AREA' ? item.heightMeters : null,
    item.notes?.trim() ?? ''
  ]);
}

/** Used for both new additions and old persisted quotes. Preserve the first row's id/order. */
export function mergeQuoteItems(items: readonly QuoteItem[]): readonly QuoteItem[] {
  const merged = new Map<string, QuoteItem>();
  for (const item of items) {
    const key = getQuoteItemIdentity(item);
    const existing = merged.get(key);
    const quantity = item.erp ? Math.round(((existing?.quantity ?? 0) + item.quantity) * 1e6) / 1e6 : (existing?.quantity ?? 0) + item.quantity;
    if (item.erp ? !validErpQuantity(quantity, item.erp.quantityRules) : !Number.isSafeInteger(quantity)) throw new RangeError('Quote quantity exceeds allowed range');
    merged.set(key, existing ? { ...existing, quantity } : item);
  }
  return [...merged.values()];
}

export function calculateArea(width: number, height: number): number {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    && Number.isFinite(width * height) ? width * height : 0;
}

export function validQuantity(quantity: number, minimum = 1): boolean {
  return Number.isSafeInteger(quantity) && quantity >= Math.max(1, minimum);
}

/** Truncate decimals, enforce the configured minimum, and reject unsafe numbers. */
export function normalizeQuantity(quantity: number, minimum = 1): number {
  const integer = Math.trunc(quantity);
  return Number.isSafeInteger(integer) ? Math.max(1, minimum, integer) : Math.max(1, minimum);
}

export function quantityLabel(quantity: number, unit: string): string {
  const plurals: Record<string, string> = { millar: 'millares', ciento: 'cientos', unidad: 'unidades', pieza: 'piezas', 'm²': 'm²' };
  const label = unit.trim();
  const singular = Object.entries(plurals).find(([, plural]) => plural === label)?.[0] ?? label;
  return `${quantity} ${quantity === 1 ? singular : (plurals[singular] ?? (label.endsWith('s') ? label : `${label}s`))}`;
}

export function createQuoteItem(product: Product, config: QuoteConfiguration, id: string): QuoteItem | null {
  if (product.configuration?.mode === 'UNAVAILABLE') return null;
  if (product.configuration?.mode === 'ERP') return createErpQuoteItem(product, config, id);
  if (config.erp) return null;
  if (!product.published || !validQuantity(config.quantity, product.minQuantity)) return null;
  if (product.saleType === 'PACK' && (!product.packSize || !product.packLabel)) return null;
  const area = calculateArea(config.widthMeters ?? 0, config.heightMeters ?? 0);
  if (product.saleType === 'AREA' && (!area || (config.widthMeters ?? 0) < 0.01 || (config.heightMeters ?? 0) < 0.01)) return null;
  const material = product.materials?.find(option => option.id === config.materialId);
  if (product.materials?.length && !material) return null;
  const extraIds = [...new Set(config.extraIds ?? [])];
  if (extraIds.some(id => !product.extras?.some(option => option.id === id))) return null;
  return {
    id, productId: product.id, productSlug: product.slug, productName: product.name,
    saleType: product.saleType, quantity: config.quantity, unitLabel: product.unitLabel,
    ...(product.saleType === 'PACK' ? { packSize: product.packSize, packLabel: product.packLabel } : {}),
    ...(product.saleType === 'AREA' ? { widthMeters: config.widthMeters, heightMeters: config.heightMeters, areaSquareMeters: area } : {}),
    ...(material ? { selectedMaterial: { ...material } } : {}),
    selectedExtras: product.extras?.filter(option => extraIds.includes(option.id)).map(option => ({ ...option })) ?? [],
    notes: config.notes?.trim().slice(0, 1000) || undefined
  };
}

export function describeQuoteItem(item: QuoteItem): string {
  if (item.erp) {
    const labels: Record<string, string> = { ancho: 'Ancho', alto: 'Alto', longitud: 'Longitud' };
    return [quantityLabel(item.quantity, item.unitLabel), `Material: ${item.erp.materialName}`,
      item.erp.modelName ? `Modelo: ${item.erp.modelName}` : '',
      ...Object.entries(item.erp.measures).map(([field, value]) => `${labels[field] ?? field}: ${value} m`),
      item.notes ? `Notas: ${item.notes.replace(/\s+/g, ' ')}` : ''].filter(Boolean).join(' — ');
  }
  let detail = item.saleType === 'AREA'
    ? `${item.widthMeters!.toFixed(2)} m x ${item.heightMeters!.toFixed(2)} m = ${item.areaSquareMeters!.toFixed(2)} m²${item.quantity > 1 ? ` — ${quantityLabel(item.quantity, 'pieza')}` : ''}`
    : quantityLabel(item.quantity, item.packLabel ?? item.unitLabel);
  if (item.selectedMaterial) detail += ` — Material: ${item.selectedMaterial.name}`;
  if (item.selectedExtras?.length) detail += ` — Extras: ${item.selectedExtras.map(extra => extra.name).join(', ')}`;
  if (item.notes) detail += ` — Notas: ${item.notes.replace(/\s+/g, ' ')}`;
  return detail;
}

export function buildQuoteMessage(items: readonly QuoteItem[]): string {
  return 'Hola, estoy cotizando desde la web de MIQA.\n\n'
    + items.map(item => `• ${item.productName} — ${describeQuoteItem(item)}`).join('\n')
    + '\n\nQuisiera recibir una cotización.';
}
