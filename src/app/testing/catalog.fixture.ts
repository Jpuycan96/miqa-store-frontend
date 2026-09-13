import { of } from 'rxjs';
import { ProductCatalog, CatalogFilters } from '../core/data/product-catalog';
import { PRODUCTS, PRODUCT_CATEGORIES } from '../core/data/products.mock';

/** Synchronous catalog for isolated UI/quote regression tests, never application providers. */
export function provideTestCatalog() {
  return { provide: ProductCatalog, useValue: {
    list: (filters: CatalogFilters = {}) => of(PRODUCTS.filter(product =>
      (!filters.category || product.categorySlug === filters.category)
      && (!filters.search || product.name.toLowerCase().includes(filters.search.toLowerCase()))
      && (filters.featured === undefined || product.featured === filters.featured))),
    categories: () => of(PRODUCT_CATEGORIES),
    findBySlug: (slug: string) => of(PRODUCTS.find(product => product.slug === slug))
  } };
}
