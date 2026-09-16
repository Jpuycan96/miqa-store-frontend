// @ts-ignore Build helper is intentionally plain Node ESM.
import { generateSitemap, renderSitemap, sitemapUrls } from '../../../../scripts/generate-sitemap.mjs';

describe('SEO sitemap generator',()=>{
  it('includes canonical public pages and only published products',()=>{
    const urls=sitemapUrls([{slug:'publicado',published:true},{slug:'borrador',published:false},{slug:'',published:true}]);
    expect(urls).toEqual(['https://store.solucionesmicaela.com/','https://store.solucionesmicaela.com/productos','https://store.solucionesmicaela.com/productos/publicado']);
    const xml=renderSitemap(urls);expect(xml).toContain('<loc>https://store.solucionesmicaela.com/</loc>');expect(xml).not.toContain('admin');expect(urls.every((url:string)=>!url.includes('?'))).toBe(true);expect(xml).not.toContain('borrador');
  });
  it('escapes XML values',()=>{expect(renderSitemap(['https://example.test/?a=1&b=2'])).toContain('&amp;');});
  it('fails clearly when the public API is unavailable',async()=>{
    await expect(generateSitemap({fetchImpl:async()=>({ok:false,status:503})})).rejects.toThrow('respondió 503');
  });
});
