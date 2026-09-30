import { Product } from '../../shared/models/product';
import { QuoteConfiguration, QuoteItem } from '../../shared/models/quote-item';
import { validErpQuantity } from '../../shared/models/erp-configuration';

export function createErpQuoteItem(product: Product, selection: QuoteConfiguration, id: string): QuoteItem | null {
  const binding = product.configuration;
  const config = binding?.configuration;
  const chosen = selection.erp;
  if (!product.published || binding?.mode !== 'ERP' || !config || !chosen
      || chosen.erpServiceId !== binding.erpServiceId || chosen.catalogRevision !== binding.catalogRevision
      || chosen.configurationVersion !== binding.configurationVersion || !validErpQuantity(selection.quantity, config.cantidad)) return null;
  const material = config.materiales.find(m => m.erpMaterialId === chosen.erpMaterialId);
  if (!material) return null;
  const model = material.modelos.find(m => m.erpModelId === chosen.erpModelId);
  if (material.modoModelos === 'SIN_MODELO' ? !!chosen.erpModelId : !model) return null;
  const fields = config.medidas.camposRequeridos.filter(field => field !== 'cantidad');
  if (!chosen.measures || Object.keys(chosen.measures).length !== fields.length || fields.some(field => {
    const value = chosen.measures[field];
    return !Number.isFinite(value) || value < 0.01 || value > 1000 || Math.abs(value * 1e6 - Math.round(value * 1e6)) > 0.000001;
  })) return null;
  return {
    id, productId: product.id, productSlug: product.slug, productName: product.name,
    saleType: product.saleType, quantity: selection.quantity, unitLabel: config.cantidad.unidad,
    notes: selection.notes?.trim().slice(0, 1000) || undefined,
    erp: { ...chosen, measures: { ...chosen.measures }, materialName: material.nombreReferencia,
      modelName: model?.nombreReferencia, quantityRules: { ...config.cantidad } }
  };
}
