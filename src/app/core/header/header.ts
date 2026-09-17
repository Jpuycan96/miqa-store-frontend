import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, filter, map, of, startWith, switchMap } from 'rxjs';
import { ProductCatalog } from '../data/product-catalog';
import { publicSeoCategory } from '../seo/category-seo';
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
 readonly activeCategory = signal(this.categoryFromUrl(this.router.url));
 readonly searchOpen = signal(false);
 readonly search = new FormControl<string>(this.router.parseUrl(this.router.url).queryParams['buscar']??'',{nonNullable:true});
 readonly results = toSignal(this.search.valueChanges.pipe(
  map(value=>value.trim().slice(0,120)),debounceTime(250),
  switchMap(search=>{
   if(this.catalogMode()){
    const tree=this.router.parseUrl(this.router.url);
    void this.router.navigate(tree.root.children['primary']?.segments.map(segment=>segment.path)??['productos'],{queryParams:{...tree.queryParams,buscar:search||null},replaceUrl:true});
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
  this.activeCategory.set(this.categoryFromUrl(this.router.url));
  if(this.catalogMode())this.search.setValue(this.router.parseUrl(this.router.url).queryParams['buscar']??'',{emitEvent:false});
 });}
 categoryLink(slug: string): string { return publicSeoCategory(slug) ? `/productos/${slug}` : '/productos'; }
 categoryQueryParams(slug: string): Record<string, string> | null { return publicSeoCategory(slug) ? null : { categoria: slug }; }
 private categoryFromUrl(url: string): string {
  const tree=this.router.parseUrl(url);
  const pathSlug=tree.root.children['primary']?.segments[1]?.path??'';
  return publicSeoCategory(pathSlug)?.slug??tree.queryParams['categoria']??'';
 }
 private readonly searchToggle = viewChild<ElementRef<HTMLButtonElement>>('searchToggle');
 private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
 toggleSearch() { this.closeMenu(); this.searchOpen.update(open=>!open); if(this.searchOpen())setTimeout(()=>this.searchInput()?.nativeElement.focus()); }
 closeSearch() { this.searchOpen.set(false); this.searchToggle()?.nativeElement.focus(); }
 closeMenu() { this.menuOpen.set(false); }
 navigate() { this.closeMenu();this.searchOpen.set(false); }
}
