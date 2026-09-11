import { HomeProject } from '../../../shared/models/home-project';

// Structural examples. Replace with real project information and image URLs
// from /images/projects/ when photography is available.
export const HOME_PROJECTS: readonly HomeProject[] = [
  { id: 1, title: 'Fachada comercial', category: 'Letreros e instalación', slug: 'fachada-comercial', featured: true, layoutVariant: 'lead' },
  { id: 2, title: 'Señalética corporativa', category: 'Señalética', slug: 'senaletica-corporativa' },
  { id: 3, title: 'Implementación de local', category: 'Producción e instalación', slug: 'implementacion-local' },
  { id: 4, title: 'Gráfica de gran formato', category: 'Impresión', slug: 'grafica-gran-formato' },
  { id: 5, title: 'Letras corpóreas', category: 'Letreros', slug: 'letras-corporeas', layoutVariant: 'wide' }
];
