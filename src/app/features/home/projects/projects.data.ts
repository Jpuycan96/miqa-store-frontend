import { HomeProject } from '../../../shared/models/home-project';

export const HOME_PROJECTS: readonly HomeProject[] = [
  { id: 1, title: 'Letreros Publicitarios', category: 'Letreros e instalación', slug: 'letreros-publicitarios', image: '/images/projects/fachadas.png', imageAlt: 'Collage de fachadas y letreros publicitarios instalados por MIQA', featured: true, layoutVariant: 'lead' },
  { id: 2, title: 'Señaléticas', category: 'Señalética', slug: 'senaleticas', image: '/images/projects/señaletica.png', imageAlt: 'Collage de proyectos de señalética realizados por MIQA' },
  { id: 3, title: 'Implementación de local', category: 'Producción e instalación', slug: 'implementacion-local', image: '/images/projects/implementacion_de_local.png', imageAlt: 'Collage del proceso de implementación de locales realizado por MIQA' },
  { id: 4, title: 'Impresión de gran formato', category: 'Impresión', slug: 'impresion-gran-formato', image: '/images/projects/gran-formato.png', imageAlt: 'Collage de impresiones e instalaciones de gran formato realizadas por MIQA' },
  { id: 5, title: 'Merchandising', category: 'Productos personalizados', slug: 'merchandising', image: '/images/projects/merchandising.png', imageAlt: 'Collage de productos de merchandising personalizados por MIQA', layoutVariant: 'wide' }
];
