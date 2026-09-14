import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, signal, viewChildren } from '@angular/core';
import { contactWhatsAppUrl } from '../../../core/config/whatsapp';
import { NgOptimizedImage } from '@angular/common';
@Component({
 selector: 'app-hero', imports: [NgOptimizedImage], templateUrl: './hero.html',
 styleUrl: './hero.scss', changeDetection: ChangeDetectionStrategy.OnPush
})
export class Hero {
 readonly contactUrl = contactWhatsAppUrl();
 readonly ready = signal(false);
 private readonly images = viewChildren<ElementRef<HTMLImageElement>>('heroImage');
 constructor(){afterNextRender(()=>this.imagesLoaded());}
 imagesLoaded(){if(this.images().length===3 && this.images().every(image=>image.nativeElement.complete))this.ready.set(true);}
}
