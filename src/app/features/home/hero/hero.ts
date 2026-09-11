import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
@Component({
 selector: 'app-hero', imports: [NgOptimizedImage], templateUrl: './hero.html',
 styleUrl: './hero.scss', changeDetection: ChangeDetectionStrategy.OnPush
})
export class Hero { readonly contact = output<void>(); }
