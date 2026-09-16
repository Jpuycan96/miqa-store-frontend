import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, filter, map, of, startWith, switchMap } from 'rxjs';
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
 private readonly source = inject(ProductCatalog);
 readonly catalogMode = input(false);
 readonly categories = toSignal(inject(ProductCatalog).categories().pipe(map(items => items.slice(0,6)),catchError(()=>of([]))),{initialValue:[]});
 readonly menuOpen = signal(false);
 readonly activeCategory = signal(this.router.parseUrl(this.router.url).queryParams['categoria']??'');
 readonly searchOpen = signal(false);
 readonly search = new FormControl<string>(this.router.parseUrl(this.router.url).queryParams['buscar']??'',{nonNullable:true});
 readonly results = toSignal(this.search.valueChanges.pipe(
  map(value=>value.trim().slice(0,120)),debounceTime(250),
  switchMap(search=>{
   if(this.catalogMode()){
    void this.router.navigate(['/productos'],{queryParams:{...this.router.parseUrl(this.router.url).queryParams,buscar:search||null},replaceUrl:true});
    return of({products:[],loading:false,error:false});
   }
   return search ? this.source.list({search}).pipe(
    map(products=>({products,loading:false,error:false})),
    startWith({products:[],loading:true,error:false}),
    catchError(()=>of({products:[],loading:false,error:true}))
   ) : of({products:[],loading:false,error:false});
  })
 ),{initialValue:{products:[],loading:false,error:false}});
 constructor(){this.router.events.pipe(filter(event=>event instanceof NavigationEnd),takeUntilDestroyed()).subscribe(()=>{
  this.activeCategory.set(this.router.parseUrl(this.router.url).queryParams['categoria']??'');
  if(this.catalogMode())this.search.setValue(this.router.parseUrl(this.router.url).queryParams['buscar']??'',{emitEvent:false});
 });}
 private readonly searchToggle = viewChild<ElementRef<HTMLButtonElement>>('searchToggle');
 private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
 toggleSearch() { this.closeMenu(); this.searchOpen.update(open=>!open); if(this.searchOpen())setTimeout(()=>this.searchInput()?.nativeElement.focus()); }
 closeSearch() { this.searchOpen.set(false); this.searchToggle()?.nativeElement.focus(); }
 closeMenu() { this.menuOpen.set(false); }
 navigate() { this.closeMenu();this.searchOpen.set(false); }
}
