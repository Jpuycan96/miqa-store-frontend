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

/** Public-shaped MATERIAL fixture only, not a real published product. */
export function materialProduct(fixedModel: string | null = null, materialId = '10'): Product {
  const original = erpProduct('ESCALA');
  const source = original.configuration!.configuration!;
  const material = source.materiales.find(option => option.erpMaterialId === materialId)!;
  const models = material.modoModelos === 'SIN_MODELO' ? [] : [
    ...material.modelos, { erpModelId: '21', nombreReferencia: 'Segundo modelo' }
  ];
  return { ...original, id: 'material-banner', slug: 'banner-material', name: 'Banner comercial', configuration: {
    ...original.configuration!, publicationScope: 'MATERIAL', fixedErpMaterialId: materialId, fixedErpModelId: fixedModel,
    configuration: { ...source, modoMaterial: 'FIJO', materiales: [{ ...material,
      modoModelos: fixedModel ? 'FIJO' : material.modoModelos,
      modelos: fixedModel ? models.filter(model => model.erpModelId === fixedModel) : models }] }
  } };
}


export function mixedErpProduct(): Product {
  const product=erpProduct('M2');const binding=product.configuration!;const base=binding.configuration!;
  const materials=['16','30','31'].map(id=>({erpMaterialId:id,nombreReferencia:id==='16'?'Microperforado':'Magnético '+id,
    modoModelos:'SIN_MODELO' as const,modelos:[]}));
  binding.configuration={...base,formaCotizacion:'POR_MATERIAL',modoMaterial:'SELECCION',
    medidas:{modo:'POR_MATERIAL',unidad:null,camposRequeridos:['cantidad']},materiales:materials};
  binding.materialConfigurations=materials.map(material=>({erpMaterialId:material.erpMaterialId,erpModelId:null,
    configuration:{...base,modoMaterial:'FIJO',formaCotizacion:material.erpMaterialId==='16'?'M2':'METRO_LINEAL',
      medidas:material.erpMaterialId==='16'?{modo:'SUPERFICIE',unidad:'m',camposRequeridos:['ancho','alto','cantidad']}:
        {modo:'LONGITUD',unidad:'m',camposRequeridos:['longitud','cantidad']},materiales:[material]}}));
  return product;
}
