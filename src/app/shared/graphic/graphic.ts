import { ChangeDetectionStrategy, Component, input } from '@angular/core';
export type GraphicKind = 'studio' | 'sign' | 'wayfinding' | 'print' | 'merch';
@Component({
 selector: 'app-graphic', templateUrl: './graphic.html', styleUrl: './graphic.scss',
 host: { 'aria-hidden': 'true' }, changeDetection: ChangeDetectionStrategy.OnPush
})
export class Graphic { readonly kind = input.required<GraphicKind>(); }

