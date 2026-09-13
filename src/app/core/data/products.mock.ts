import { Product, ProductCategory } from '../../shared/models/product';

export const PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  { slug: 'impresion-gran-formato', name: 'Impresión gran formato' },
  { slug: 'letreros-publicitarios', name: 'Letreros Publicitarios' },
  { slug: 'merchandising', name: 'Merchandising' },
  { slug: 'imprenta-papeleria', name: 'Imprenta y Papelería' },
  { slug: 'senaletica', name: 'Señalética' },
  { slug: 'branding-instalaciones', name: 'Branding e Instalaciones' }
];

/** TEST FIXTURE ONLY. Never imported by the application. Local examples. Images are existing brand/product references, not new product photography. */
export const PRODUCTS: readonly Product[] = [
  {
    id: 'tarjetas-personales', slug: 'tarjetas-personales', name: 'Tarjetas personales',
    shortDescription: 'Una presentación que acompaña a tu marca en cada encuentro.',
    description: 'Prepara tus tarjetas personales y cuéntanos cómo quieres presentar tu marca. Selecciona los millares que necesitas; nuestro equipo te ayudará a definir los detalles de producción.',
    categorySlug: 'imprenta-papeleria', image: '/images/products/tarjetas-personales.png',
    featured: true, published: true, saleType: 'PACK', unitLabel: 'unidad', packSize: 1000, packLabel: 'millar', minQuantity: 1, step: 1
  },
  {
    id: 'volantes-a5', slug: 'volantes-a5', name: 'Volantes A5',
    shortDescription: 'Dale alcance a tu próxima campaña con piezas impresas.',
    description: 'Comparte tus promociones con volantes A5. Indica cuántos millares necesitas y añade cualquier detalle de tu campaña para recibir una cotización personalizada.',
    categorySlug: 'imprenta-papeleria', image: '/images/products/volantes.png',
    featured: true, published: true, saleType: 'PACK', unitLabel: 'unidad', packSize: 1000, packLabel: 'millar', minQuantity: 1, step: 1
  },
  {
    id: 'roll-up', slug: 'roll-up', name: 'Roll Up',
    shortDescription: 'Tu mensaje presente en eventos, puntos de venta y espacios comerciales.',
    description: 'Selecciona la cantidad de Roll Up para tu proyecto. Comparte tus necesidades y nuestro equipo confirmará contigo las medidas y los detalles de la presentación.',
    categorySlug: 'impresion-gran-formato', image: '/images/hero/rollo-up.png',
    featured: true, published: true, saleType: 'QUANTITY', unitLabel: 'unidad', minQuantity: 1, step: 1
  },
  {
    id: 'vinil-impreso', slug: 'vinil-impreso', name: 'Vinil impreso',
    shortDescription: 'Gráfica a medida para dar presencia a tu marca.',
    description: 'Indica el ancho y alto de cada pieza en metros, elige un material y los acabados que necesitas. Las medidas son referenciales para que nuestro equipo prepare tu cotización.',
    categorySlug: 'impresion-gran-formato', image: '/images/products/impresion-alta-calidad.png',
    featured: true, published: true, saleType: 'AREA', unitLabel: 'm²', minQuantity: 1, step: 1,
    materials: [{ id: 'blanco', name: 'Vinil blanco' }, { id: 'transparente', name: 'Vinil transparente' }, { id: 'microperforado', name: 'Microperforado' }],
    extras: [{ id: 'laminado', name: 'Laminado' }, { id: 'corte-especial', name: 'Corte especial' }]
  },
  {
    id: 'banner', slug: 'banner', name: 'Banner',
    shortDescription: 'Un formato amplio para comunicar a tu medida.',
    description: 'Configura las medidas de tu banner y los acabados que requiere la instalación. Nuestro equipo revisará tu solicitud y te asesorará antes de producir.',
    categorySlug: 'impresion-gran-formato', image: '/images/products/impresion-alta-calidad.png',
    featured: true, published: true, saleType: 'AREA', unitLabel: 'm²', minQuantity: 1, step: 1,
    materials: [{ id: 'banner-13', name: 'Banner 13 oz' }],
    extras: [{ id: 'ojales', name: 'Ojales' }, { id: 'bolsillos', name: 'Bolsillos' }]
  }
];
