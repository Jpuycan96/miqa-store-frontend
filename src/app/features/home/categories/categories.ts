import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Graphic } from '../../../shared/graphic/graphic';
import { HOME_CATEGORIES } from './categories.data';
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
@Component({
 selector: 'app-categories', imports: [Graphic, NgOptimizedImage], templateUrl: './categories.html',
 styleUrl: './categories.scss', changeDetection: ChangeDetectionStrategy.OnPush
})
export class Categories {
 readonly query = input('');
 readonly explore = output<string>();
 readonly categories = computed(() => HOME_CATEGORIES.filter(category => normalize(category.name).includes(normalize(this.query()))));
}
