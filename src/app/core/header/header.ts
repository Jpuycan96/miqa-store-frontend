import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, filter, map, of, startWith, Subject, switchMap } from 'rxjs';
import { ProductCatalog } from '../data/product-catalog';
import { QuotePresentation } from '../quote/quote-presentation';
import { QuoteStore } from '../quote/quote-store';
import { FloatingWhatsApp } from '../whatsapp/floating-whatsapp';
@Component({
 selector: 'app-header', imports: [NgOptimizedImage, RouterLink, ReactiveFormsModule, FloatingWhatsApp], templateUrl: './header.html',
 styleUrl: './header.scss', changeDetection: ChangeDetectionStrategy.OnPush
})
export class Header {
 readonly quote = inject(QuoteStore);
 readonly quotePresentation = inject(QuotePresentation);
 private readonly router = inject(Router);
 private readonly source = inject(ProductCatalog);
 readonly catalogMode = input(false);
 private readonly categoryRefresh = new Subject<void>();
 private readonly initialNavigationId = this.router.currentNavigation()?.id;
 readonly categoryState = toSignal(this.categoryRefresh.pipe(startWith(undefined),
  switchMap(() => (this.source.commercialCategories?.().pipe(
   switchMap(categories => categories.length ? of(categories) : this.source.categories())
  ) ?? this.source.categories()).pipe(
   map(categories=>({categories,loading:false,error:false})),
   startWith({categories:[],loading:true,error:false}),
   catchError(() => of({categories:[],loading:false,error:true}))))),
  {initialValue:{categories:[],loading:true,error:false}});
 readonly categories = computed(()=>this.categoryState().categories);
 readonly expandedCategory = signal('');
 readonly activeSubcategory = computed(()=>this.router.parseUrl(this.currentUrl()).queryParams['subcategory']??'');
 readonly menuOpen = signal(false);
 private readonly currentUrl = signal(this.router.url);
 readonly activeCategory = computed(()=>{
  const tree=this.router.parseUrl(this.currentUrl());
  const pathSlug=tree.root.children['primary']?.segments[1]?.path??'';
  return tree.queryParams['commercialCategory'] ?? this.categories().find(category=>category.subcategories?.some(sub=>sub.slug===tree.queryParams['subcategory']))?.slug
   ?? (this.categories().some(category=>category.slug===pathSlug)?pathSlug:tree.queryParams['categoria']??'');
 });
 readonly searchOpen = signal(false);
 readonly search = new FormControl<string>(this.router.parseUrl(this.router.url).queryParams['buscar']??'',{nonNullable:true});
 private readonly searchText = toSignal(this.search.valueChanges, {initialValue:this.search.value});
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
 constructor(){
  this.router.events.pipe(filter(event=>event instanceof NavigationEnd),takeUntilDestroyed()).subscribe(event=>{
  const previousPath=this.currentUrl().split('?')[0];
  this.currentUrl.set(this.router.url);
  if (event.id !== this.initialNavigationId && previousPath !== this.router.url.split('?')[0]) this.categoryRefresh.next();
  this.expandedCategory.set('');
  if(this.catalogMode())this.search.setValue(this.router.parseUrl(this.router.url).queryParams['buscar']??'',{emitEvent:false});
 });}
 categoryLink(slug: string): string { return `/productos/${slug}`; }
 commercialLink(slug: string, subcategory?: string) {
  const search=this.catalogMode() ? this.router.parseUrl(this.currentUrl()).queryParams['buscar']??'' : this.searchText();
  return {commercialCategory:slug,subcategory:subcategory??null,buscar:search.trim()||null};
 }
 retryCategories() { this.categoryRefresh.next(); }
 enterCategory(event: PointerEvent, slug: string) { if(event.pointerType==='mouse') this.expandedCategory.set(slug); }
 toggleCategory(slug: string) { this.expandedCategory.update(current=>current===slug?'':slug); }
 closeCategory(event: Event) {
  this.expandedCategory.set('');
  const target=event.currentTarget as HTMLElement;
  target.querySelector<HTMLButtonElement>('.subcategory-toggle')?.focus();
  event.stopPropagation();
 }
 categoryFocusOut(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) this.expandedCategory.set('');
 }
 private readonly searchToggle = viewChild<ElementRef<HTMLButtonElement>>('searchToggle');
 private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
 toggleSearch() { this.closeMenu(); this.searchOpen.update(open=>!open); if(this.searchOpen())setTimeout(()=>this.searchInput()?.nativeElement.focus()); }
 closeSearch() { this.searchOpen.set(false); this.searchToggle()?.nativeElement.focus(); }
 closeMenu() { this.menuOpen.set(false); this.expandedCategory.set(''); }
 navigate() { this.closeMenu();this.searchOpen.set(false); }
 async openQuote() {
  this.navigate();
  this.quote.close();
  if (!this.quotePresentation.catalogPage() && !this.quotePresentation.productDetail()) {
   if (!await this.router.navigate(['/productos'])) return;
  }
  this.quotePresentation.requestPanel();
 }
}
