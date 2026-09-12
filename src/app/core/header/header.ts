import { NgOptimizedImage } from '@angular/common';
import { contactWhatsAppUrl } from '../config/whatsapp';
import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { QuoteStore } from '../quote/quote-store';
@Component({
 selector: 'app-header', imports: [NgOptimizedImage], templateUrl: './header.html',
 styleUrl: './header.scss', changeDetection: ChangeDetectionStrategy.OnPush
})
export class Header {
 readonly quote = inject(QuoteStore);
 readonly catalogMode = input(false);
 readonly contactUrl = contactWhatsAppUrl();
 readonly menuOpen = signal(false);
 readonly searchOpen = signal(false);
 readonly searchChange = output<string>();
 readonly notice = output<string>();
 private readonly searchToggle = viewChild<ElementRef<HTMLButtonElement>>('searchToggle');
 closeSearch() { this.searchOpen.set(false); this.searchToggle()?.nativeElement.focus(); }
 closeMenu() { this.menuOpen.set(false); }
}
