export interface AdminCategory { erpCategoryId?: string | null; id: string; name: string; slug: string; description: string | null; catalogHeadline: string | null; catalogDescription: string | null; active: boolean; displayOrder: number; }
export type CategoryInput = Omit<AdminCategory,'id' | 'slug' | 'erpCategoryId'>;
export interface AdminOption { id: string; name: string; active: boolean; displayOrder: number; }
export interface AdminImage { id: string; url: string; publicUrl: string; altText: string; primaryImage: boolean; displayOrder: number; }
export interface ProductInput {
 categoryId: string; name: string; slug: string; shortDescription: string; description: string;
 saleType: 'QUANTITY' | 'PACK' | 'AREA' | null; unitLabel: string | null; packSize: number | null; packLabel: string | null;
 minQuantity: number | null; quantityStep: number | null; featured: boolean; published: boolean; displayOrder: number;
 seoTitle: string | null; seoDescription: string | null;
}
export interface AdminProduct extends ProductInput { catalogMode?: 'ERP' | 'LEGACY'; id: string; category: AdminCategory; image: string; materials: AdminOption[]; extras: AdminOption[]; images: AdminImage[]; }
export type OptionInput = Omit<AdminOption,'id'>;
export type ImageInput = Omit<AdminImage,'id' | 'publicUrl'>;
