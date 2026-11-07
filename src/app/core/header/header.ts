import { NgOptimizedImage } from '@angular/common';
import { afterNextRender, afterRenderEffect, DestroyRef, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, signal, viewChild } from '@angular/core';
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
 private readonly searchText = signal(this.search.value);
 readonly compactCategories = signal(false);
 readonly inlineCategories = signal(false);
 private readonly headerElement = inject<ElementRef<HTMLElement>>(ElementRef);
 private measureCategories?: () => void;
 private searchVersion = 0;
 private searchDestination?: string;
 readonly results = toSignal(this.search.valueChanges.pipe(
  map(value=>{
   this.searchText.set(value);
   if(!value.trim())this.clearSearch();
   return {search:value.trim().slice(0,120),version:this.searchVersion};
  }),debounceTime(250),
  switchMap(({search,version})=>{
   if(!search || version!==this.searchVersion)return of({products:[],loading:false,error:false});
   if(this.catalogMode()){
    const options={queryParams:{buscar:search||null},replaceUrl:true};
    this.searchDestination=this.router.serializeUrl(this.router.createUrlTree(['productos'],options));
    void this.router.navigate(['productos'],options);
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
  const destroy=inject(DestroyRef);
  afterNextRender(()=>{
   if(typeof ResizeObserver==='undefined')return;
   const root=this.headerElement.nativeElement;
   const bar=root.querySelector<HTMLElement>('.main-bar')!;
   const nav=root.querySelector<HTMLElement>('.desktop-nav')!;
   const heightStyle=root.ownerDocument.documentElement.style;
   const previousHeight=heightStyle.getPropertyValue('--store-header-height');
   const canvas=document.createElement('canvas');
   const context=canvas.getContext('2d');
   this.measureCategories=()=>{
    heightStyle.setProperty('--store-header-height',`${Math.ceil(root.getBoundingClientRect().height)}px`);
    const links=[...nav.querySelectorAll<HTMLElement>('.category-row>a,.all')];
    const needed=links.reduce((total,link)=>{
     const style=getComputedStyle(link);if(context)context.font=style.font;
     return total+(context?.measureText(link.textContent??'').width??link.scrollWidth)+8
       +(link.parentElement?.querySelector('.subcategory-toggle')?24:0);
    },0)+Math.max(0,links.length-1)*12;
    const controls=bar.querySelector<HTMLElement>('.controls')!.getBoundingClientRect().width;
    const brand=bar.querySelector<HTMLElement>('.brand')!.getBoundingClientRect().width;
    const inline=!this.searchOpen() && needed<=bar.clientWidth-brand-controls-48;
    this.inlineCategories.set(inline);
    const tracks=getComputedStyle(nav).gridTemplateRows.trim();
    const rows=tracks && tracks!=='none'?tracks.split(/\s+/).length:1;
    this.compactCategories.set(!inline && rows>2);
   };
   const observer=new ResizeObserver(()=>this.measureCategories?.());
   observer.observe(bar);observer.observe(nav);
   this.measureCategories();
   void document.fonts?.ready.then(()=>{if(!destroy.destroyed)this.measureCategories?.();});
   destroy.onDestroy(()=>{observer.disconnect();if(previousHeight)heightStyle.setProperty('--store-header-height',previousHeight);else heightStyle.removeProperty('--store-header-height');});
  });
  afterRenderEffect(()=>{
   this.categories();this.searchOpen();this.expandedCategory();this.measureCategories?.();
   const root=this.headerElement.nativeElement;
   for(const dropdown of root.querySelectorAll<HTMLElement>('.subcategory-dropdown:not([hidden])')){
    dropdown.style.translate='none';
    const bounds=dropdown.getBoundingClientRect();
    const width=root.ownerDocument.defaultView?.innerWidth??0;
    const shift=Math.min(0,width-16-bounds.right)+Math.max(0,16-bounds.left);
    dropdown.style.translate=`${shift}px 0`;
   }
   if(this.compactCategories() && root.querySelector('.desktop-nav')?.contains(root.ownerDocument.activeElement))
    root.querySelector<HTMLButtonElement>('.mobile-toggle')?.focus();
  });
  this.router.events.pipe(filter(event=>event instanceof NavigationEnd),takeUntilDestroyed()).subscribe(event=>{
  const previousPath=this.currentUrl().split('?')[0];
  this.currentUrl.set(this.router.url);
  if (event.id !== this.initialNavigationId && previousPath !== this.router.url.split('?')[0]) this.categoryRefresh.next();
  this.expandedCategory.set('');
  if(event.id!==this.initialNavigationId){
   const ownSearch=event.urlAfterRedirects===this.searchDestination;
   this.searchDestination=undefined;
   if(!ownSearch)this.closeSearch(false);
  }
 });}
 private clearSearch() {
  const tree=this.router.parseUrl(this.router.url);
  const filtered=!!tree.queryParams['buscar'];
  this.closeSearch(false);
  if(filtered){
   delete tree.queryParams['buscar'];
   this.searchDestination=this.router.serializeUrl(tree);
   void this.router.navigateByUrl(tree,{replaceUrl:true});
  }
  this.searchToggle()?.nativeElement.focus();
 }
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
 toggleSearch() {
  if(this.searchOpen()){this.closeSearch();return;}
  this.closeMenu();this.searchOpen.set(true);
  setTimeout(()=>{if(this.searchOpen())this.searchInput()?.nativeElement.focus();});
 }
 closeSearch(focus = true) {
  this.searchVersion++;this.searchDestination=undefined;
  this.searchOpen.set(false);this.search.setValue('',{emitEvent:false});this.searchText.set('');
  if(focus)this.searchToggle()?.nativeElement.focus();
 }
 closeMenu() { this.menuOpen.set(false); this.expandedCategory.set(''); }
 // RouterLink must consume its parameters before the successful navigation clears the field.
 navigate() { this.closeMenu();this.searchOpen.set(false);this.searchVersion++; }
 async openQuote() {
  this.navigate();
  this.quote.close();
  if (!this.quotePresentation.catalogPage() && !this.quotePresentation.productDetail()) {
   if (!await this.router.navigate(['/productos'])) return;
  }
  this.closeSearch(false);this.quotePresentation.requestPanel();
 }
}
