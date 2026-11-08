import { NgOptimizedImage } from '@angular/common';
import { afterNextRender, DestroyRef, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, filter, map, of, startWith, Subject, switchMap } from 'rxjs';
import { ProductCatalog } from '../data/product-catalog';
import { QuotePresentation } from '../quote/quote-presentation';
import { QuoteStore } from '../quote/quote-store';
import { CategoryDrawer } from './category-drawer';
import { FloatingWhatsApp } from '../whatsapp/floating-whatsapp';
@Component({
 selector: 'app-header', imports: [NgOptimizedImage, RouterLink, ReactiveFormsModule, FloatingWhatsApp, CategoryDrawer], templateUrl: './header.html',
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
  switchMap(() => (this.source.commercialCategories?.() ?? of([])).pipe(
   map(categories=>({categories,loading:false,error:false})),
   startWith({categories:[],loading:true,error:false}),
   catchError(() => of({categories:[],loading:false,error:true}))))),
  {initialValue:{categories:[],loading:true,error:false}});
 readonly categories = computed(()=>this.categoryState().categories);
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
 private readonly headerElement = inject<ElementRef<HTMLElement>>(ElementRef);
 private readonly drawer = viewChild(CategoryDrawer);
 private searchVersion = 0;
 private searchDestination?: string;
 readonly results = toSignal(this.search.valueChanges.pipe(
  map(value=>{
   this.searchText.set(value);
   if(value.trim())this.searchOpen.set(true);
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
   const style=root.ownerDocument.documentElement.style;
   const previous=style.getPropertyValue('--store-header-height');
   const update=()=>style.setProperty('--store-header-height',`${Math.ceil(root.getBoundingClientRect().height)}px`);
   const observer=new ResizeObserver(update);observer.observe(root);update();
   destroy.onDestroy(()=>{observer.disconnect();if(previous)style.setProperty('--store-header-height',previous);else style.removeProperty('--store-header-height');});
  });
  this.router.events.pipe(filter(event=>event instanceof NavigationEnd),takeUntilDestroyed()).subscribe(event=>{
  const previousPath=this.currentUrl().split('?')[0];
  this.currentUrl.set(this.router.url);
  if (event.id !== this.initialNavigationId && previousPath !== this.router.url.split('?')[0]) this.categoryRefresh.next();
  this.closeMenu();
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
 }
 menuSearch() {
  return this.catalogMode() ? this.router.parseUrl(this.currentUrl()).queryParams['buscar']??'' : this.searchText();
 }
 retryCategories() { this.categoryRefresh.next(); }
 private readonly searchToggle = viewChild<ElementRef<HTMLButtonElement>>('searchToggle');
 private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
 toggleSearch() {
  // The field is persistent: the search icon focuses it without discarding the query.
  this.closeMenu();this.searchOpen.set(true);
  this.searchInput()?.nativeElement.focus();
 }
 closeSearch(focus = true) {
  this.searchVersion++;this.searchDestination=undefined;
  this.searchOpen.set(false);this.search.setValue('',{emitEvent:false});this.searchText.set('');
  if(focus)this.searchToggle()?.nativeElement.focus();
 }
 openMenu(opener?:HTMLElement) { this.closeSearch(false);this.drawer()?.open(opener); }
 closeMenu() { this.drawer()?.close();this.menuOpen.set(false); }
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
