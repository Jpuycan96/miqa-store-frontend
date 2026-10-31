import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { STORE_API_CONFIG } from '../config/store-api';
import { CatalogApiService } from './catalog-api.service';
import { ProductDto } from './catalog-mapper';
import { materialProduct } from '../../testing/erp.fixture';

const base='http://localhost:8081/api/public';
const material: ProductDto = {
  id:'material-banner',slug:'banner-material',name:'Banner comercial',shortDescription:'Resumen',description:'Descripción',
  category:{slug:'banners',name:'Banners'},image:'/images/banner.png',published:true,featured:false,saleType:'QUANTITY',
  unitLabel:'unidad',seoTitle:'Banner propio',seoDescription:'SEO propio',configuration:materialProduct('21').configuration
};
describe('MATERIAL public catalog transport', () => {
  let http: HttpTestingController;
  let api: CatalogApiService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers:[provideHttpClient(),provideHttpClientTesting(),
      {provide:STORE_API_CONFIG,useValue:{baseUrl:'http://localhost:8081',mediaBaseUrl:''}}] });
    http=TestBed.inject(HttpTestingController); api=TestBed.inject(CatalogApiService);
  });
  afterEach(() => http.verify());
  it('preserves fixed metadata, editorial SEO/image and slug in detail', () => {
    api.findBySlug('banner-material').subscribe(product => {
      expect(product?.configuration).toEqual(material.configuration);
      expect(product).toMatchObject({id:'material-banner',slug:'banner-material',categorySlug:'banners',seoTitle:'Banner propio',image:'/images/banner.png'});
    });
    http.expectOne(base+'/products/banner-material').flush(material);
  });
  it('combines search and editorial/commercial filters, deduplicates and excludes drafts', () => {
    api.list({category:'banners',commercialCategory:'comercial',subcategory:'subcategoria-10',search:' Banner '}).subscribe(products => {
      expect(products).toHaveLength(2);
      expect(products.map(product=>product.id)).toEqual(['material-banner','service']);
      expect(products[0].configuration?.fixedErpModelId).toBe('21');
    });
    const request=http.expectOne(req=>req.url===base+'/commercial/products');
    expect(request.request.params.get('category')).toBe('banners');
    expect(request.request.params.get('search')).toBe('Banner');
    expect(request.request.params.get('subcategory')).toBe('subcategoria-10');
    request.flush([material,material,{...material,id:'draft',published:false},
      {...material,id:'service',name:'Servicio',configuration:{...material.configuration!,publicationScope:'SERVICE',fixedErpMaterialId:null,fixedErpModelId:null}}]);
  });
  it('does not return unpublished or removed detail', () => {
    api.findBySlug('draft').subscribe(product=>expect(product).toBeUndefined());
    http.expectOne(base+'/products/draft').flush({...material,published:false});
    api.findBySlug('retired').subscribe(product=>expect(product).toBeUndefined());
    http.expectOne(base+'/products/retired').flush({}, {status:404,statusText:'Not Found'});
  });
  it('accepts editorial categories without a technical ERP category ID', () => {
    api.categories().subscribe(categories=>expect(categories).toEqual([{slug:'banners',name:'Banners',catalogHeadline:undefined,catalogDescription:undefined}]));
    http.expectOne(base+'/categories').flush([{id:'editorial',slug:'banners',name:'Banners',erpCategoryId:null}]);
  });
});
