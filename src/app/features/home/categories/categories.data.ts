import { HomeCategory } from '../../../shared/models/home-category';

export const HOME_CATEGORIES: readonly HomeCategory[] = [
  { name: 'Impresión gran formato', slug: 'impresion-gran-formato', href: '/productos?categoria=impresion-gran-formato', kind: 'print', number: '01' },
  { name: 'Letreros Publicitarios', slug: 'letreros-publicitarios', href: '/productos?categoria=letreros-publicitarios', kind: 'sign', number: '02' },
  { name: 'Merchandising', slug: 'merchandising', href: '/productos?categoria=merchandising', kind: 'merch', number: '03' },
  { name: 'Imprenta y Papelería', slug: 'imprenta-papeleria', href: '/productos?categoria=imprenta-papeleria', kind: 'studio', number: '04' },
  { name: 'Señalética', slug: 'senaletica', href: '/productos?categoria=senaletica', kind: 'wayfinding', number: '05' },
  { name: 'Branding e Instalaciones', slug: 'branding-instalaciones', href: '/productos?categoria=branding-instalaciones', kind: 'sign', number: '06' }
];
