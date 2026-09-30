import { Product } from '../shared/models/product';
import { ErpSelection } from '../shared/models/erp-configuration';
import { PRODUCTS } from '../core/data/products.mock';

export function erpProduct(form: 'ESCALA' | 'M2' | 'METRO_LINEAL' = 'M2'): Product {
  return { ...PRODUCTS[2], id: 'erp-banner', slug: 'erp-banner', name: 'Banner editorial', configuration: {
    mode: 'ERP', erpServiceId: '1', catalogRevision: 'a'.repeat(64), configurationVersion: '4', configuration: {
      cantidad: { unidad: 'unidad', minimo: '0.5', incrementoSugerido: '1', multiploObligatorio: '0.5', permiteDecimales: true, precision: 2, maximo: '100' },
      modoMaterial: 'SELECCION', formaCotizacion: form,
      medidas: { modo: form === 'M2' ? 'SUPERFICIE' : form === 'ESCALA' ? 'NINGUNA' : 'LONGITUD', unidad: form === 'ESCALA' ? null : 'm',
        camposRequeridos: form === 'M2' ? ['ancho','alto','cantidad'] : form === 'ESCALA' ? ['cantidad'] : ['longitud','cantidad'] },
      materiales: [
        { erpMaterialId: '10', nombreReferencia: 'Banner 13 Oz', modoModelos: 'SELECCION', modelos: [{ erpModelId: '20', nombreReferencia: 'Modelo aprobado' }] },
        { erpMaterialId: '19', nombreReferencia: 'Banner 8 Oz', modoModelos: 'SIN_MODELO', modelos: [] }
      ]
    }
  } };
}
export function erpSelection(measures: Record<string, number> = { ancho: 2.5, alto: 1.2 }): ErpSelection {
  return { erpServiceId: '1', catalogRevision: 'a'.repeat(64), configurationVersion: '4', erpMaterialId: '10', erpModelId: '20', measures };
}
