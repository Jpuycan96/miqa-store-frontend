import { mixedErpProduct } from '../../testing/erp.fixture';
import { createErpQuoteItem } from './erp-quote';
import type { QuoteConfiguration } from '../../shared/models/quote-item';

describe('ERP v2 per-material cart rules',()=>{
  function selection(id:string,measures:Record<string,number>):QuoteConfiguration {
    const binding=mixedErpProduct().configuration!;
    return {quantity:2,erp:{erpServiceId:binding.erpServiceId!,catalogRevision:binding.catalogRevision!,configurationVersion:binding.configurationVersion!,erpMaterialId:id,measures}};
  }
  it('uses linear measures for 30/31 and area for 16 without converting them',()=>{
    const p=mixedErpProduct();
    for(const id of ['30','31']) {
      const item=createErpQuoteItem(p,selection(id,{longitud:1.5}),'item');
      expect(item?.erp?.erpMaterialId).toBe(id);expect(item?.erp?.measures).toEqual({longitud:1.5});
      expect(item?.productSlug).toBe(p.slug);expect(item?.productId).toBe(p.id);
      expect(createErpQuoteItem(p,selection(id,{ancho:1,alto:1}),'bad')).toBeNull();
    }
    expect(createErpQuoteItem(p,selection('16',{ancho:1,alto:1}),'area')).not.toBeNull();
    expect(createErpQuoteItem(p,selection('16',{longitud:1}),'bad')).toBeNull();
  });
  it('rejects missing option metadata, obsolete materials and changed fixed bindings',()=>{
    const p=mixedErpProduct();
    p.configuration!.publicationScope='MATERIAL';p.configuration!.fixedErpMaterialId='30';
    expect(createErpQuoteItem(p,selection('31',{longitud:1}),'bad')).toBeNull();
    p.configuration!.materialConfigurations=[];
    expect(createErpQuoteItem(p,selection('30',{longitud:1}),'missing')).toBeNull();
  });
});
