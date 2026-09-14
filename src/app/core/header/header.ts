import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, map, of } from 'rxjs';
import { ProductCatalog } from '../data/product-catalog';
import { QuoteStore } from '../quote/quote-store';
import { FloatingWhatsApp } from '../whatsapp/floating-whatsapp';
@Component({
 selector: 'app-header', imports: [NgOptimizedImage, RouterLink, ReactiveFormsModule, FloatingWhatsApp], templateUrl: './header.html',
 styleUrl: './header.scss', changeDetection: ChangeDetectionStrategy.OnPush
})
export class Header {
 readonly quote = inject(QuoteStore);
 private readonly router = inject(Router);
 readonly catalogMode = input(false);
 readonly categories = toSignal(inject(ProductCatalog).categories().pipe(map(items => items.slice(0,6)),catchError(()=>of([]))),{initialValue:[]});
 readonly menuOpen = signal(false);
 readonly searchOpen = signal(false);
 readonly search = new FormControl('',{nonNullable:true});
 private readonly searchToggle = viewChild<ElementRef<HTMLButtonElement>>('searchToggle');
 private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
 toggleSearch() { this.closeMenu(); this.searchOpen.update(open=>!open); if(this.searchOpen())setTimeout(()=>this.searchInput()?.nativeElement.focus()); }
 closeSearch() { this.searchOpen.set(false); this.searchToggle()?.nativeElement.focus(); }
 closeMenu() { this.menuOpen.set(false); }
 navigate() { this.closeMenu();this.searchOpen.set(false); }
 submitSearch() { this.navigate();void this.router.navigate(['/productos'],{queryParams:{buscar:this.search.value.trim().slice(0,120)||null}}); }
}
