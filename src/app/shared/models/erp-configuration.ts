export interface ErpQuantity {
  unidad: string; minimo: string; incrementoSugerido: string; multiploObligatorio: string | null;
  permiteDecimales: boolean; precision: number; maximo: string;
}
export interface ErpMaterial {
  erpMaterialId: string; nombreReferencia: string; modoModelos: 'SIN_MODELO' | 'FIJO' | 'SELECCION';
  modelos: readonly { erpModelId: string; nombreReferencia: string }[];
}
export interface ErpConfiguration {
  cantidad: ErpQuantity;
  modoMaterial: 'FIJO' | 'SELECCION';
  formaCotizacion: 'ESCALA' | 'M2' | 'METRO_LINEAL';
  medidas: { modo: string; unidad: string | null; camposRequeridos: readonly string[] };
  materiales: readonly ErpMaterial[];
}
export interface PublicConfiguration {
  mode: 'LEGACY' | 'ERP' | 'UNAVAILABLE';
  erpServiceId: string | null;
  catalogRevision: string | null;
  configurationVersion: string | null;
  configuration: ErpConfiguration | null;
}
export interface ErpSelection {
  erpServiceId: string; catalogRevision: string; configurationVersion: string;
  erpMaterialId: string; erpModelId?: string;
  measures: Readonly<Record<string, number>>;
}
export interface ErpQuoteSelection extends ErpSelection {
  materialName: string; modelName?: string; quantityRules: ErpQuantity;
}

export function validErpQuantity(value: number, rules: ErpQuantity): boolean {
  if (!Number.isFinite(value) || value < Number(rules.minimo) || value > Math.min(Number(rules.maximo), 1e9)) return false;
  const scale = 10 ** (rules.permiteDecimales ? rules.precision : 0);
  if (Math.abs(value * scale - Math.round(value * scale)) > 0.000001) return false;
  const multiple = Number(rules.multiploObligatorio);
  if (!multiple) return true;
  const ratio = value / multiple;
  return Math.abs(ratio - Math.round(ratio)) < 0.00000001;
}
