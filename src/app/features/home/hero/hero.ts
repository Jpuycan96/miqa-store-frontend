import { ChangeDetectionStrategy, Component } from '@angular/core';
import { contactWhatsAppUrl } from '../../../core/config/whatsapp';
import { NgOptimizedImage } from '@angular/common';
@Component({
 selector: 'app-hero', imports: [NgOptimizedImage], templateUrl: './hero.html',
 styleUrl: './hero.scss', changeDetection: ChangeDetectionStrategy.OnPush
})
export class Hero { readonly contactUrl = contactWhatsAppUrl(); }
