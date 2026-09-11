import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Graphic, GraphicKind } from '../../../shared/graphic/graphic';
interface Category {
 name: string;
 detail: string;
 kind: GraphicKind;
 number: string;
 // Set a local image path and descriptive alt when real photography is available.
 image?: { src: string; alt: string };
}
const CATEGORIES: Category[] = [
 { name: 'Letreros', detail: 'Tu marca, en otra dimensión.', kind: 'sign', number: '01' },
 { name: 'Señalética', detail: 'Cada espacio, bien orientado.', kind: 'wayfinding', number: '02' },
 { name: 'Impresión gran formato', detail: 'Ideas que no pasan desapercibidas.', kind: 'print', number: '03' },
 { name: 'Merchandising', detail: 'Tu marca va con ellos.', kind: 'merch', number: '04' }
];
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
@Component({
 selector: 'app-categories', imports: [Graphic, NgOptimizedImage], templateUrl: './categories.html',
 styleUrl: './categories.scss', changeDetection: ChangeDetectionStrategy.OnPush
})
export class Categories {
 readonly query = input('');
 readonly explore = output<string>();
 readonly categories = computed(() => CATEGORIES.filter(category => normalize(category.name).includes(normalize(this.query()))));
}
