import { DOCUMENT } from '@angular/common';
import { afterNextRender, afterRenderEffect, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, output, signal, viewChild, viewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';
import { switchMap, timer } from 'rxjs';
import { ProductCategory } from '../../shared/models/product';
import { CategoryMenuProducts, MenuProductGroup } from './category-menu-products';

@Component({
 selector:'app-category-drawer',imports:[RouterLink],templateUrl:'./category-drawer.html',styleUrl:'./category-drawer.scss',
 changeDetection:ChangeDetectionStrategy.OnPush, providers:[CategoryMenuProducts]
})
export class CategoryDrawer {
 readonly categories=input<readonly ProductCategory[]>([]);
 readonly loading=input(false);readonly error=input(false);
 readonly activeCategory=input('');readonly activeSubcategory=input('');readonly search=input('');
 readonly retry=output<void>();readonly navigated=output<void>();readonly openedChange=output<boolean>();
 readonly opened=signal(false);readonly selectedSlug=signal('');readonly mobile=signal(false);
 readonly selectedCategory=computed(()=>this.categories().find(c=>c.slug===this.selectedSlug()));
 readonly productGroups=signal<Readonly<Record<string,MenuProductGroup>>>({});
 private readonly menuProducts=inject(CategoryMenuProducts);
 private readonly document=inject(DOCUMENT);
 private readonly surface=viewChild<ElementRef<HTMLDialogElement>>('surface');
 private readonly closeButton=viewChild<ElementRef<HTMLButtonElement>>('closeButton');
 private readonly buttons=viewChildren<ElementRef<HTMLButtonElement>>('categoryButton');
 private readonly pendingFocus=signal('');
 private readonly pendingPanelFocus=signal(false);
 private readonly resetPanelScroll=signal(false);
 private opener?:HTMLElement;private overflow='';
 constructor(){
  const destroy=inject(DestroyRef);
  effect(onCleanup=>{
   const category=this.opened()?this.selectedCategory():undefined;
   this.productGroups.set({});
   if(!category)return;
   // Avoid fetching every category crossed on the way to the intended hover target.
   const subscription=timer(180).pipe(switchMap(()=>this.menuProducts.load(category))).subscribe(group=>{
    this.productGroups.update(groups=>({...groups,[group.slug]:group}));
   });
   onCleanup(()=>subscription.unsubscribe());
  });
  afterNextRender(()=>{
   const media=this.document.defaultView?.matchMedia?.('(max-width: 767px)');
   if(!media)return;
   const update=()=>this.mobile.set(media.matches);update();media.addEventListener('change',update);
   destroy.onDestroy(()=>media.removeEventListener('change',update));
  });
  afterRenderEffect(()=>{
   const dialog=this.surface()?.nativeElement;
   if(this.opened() && dialog && !dialog.open){dialog.showModal();this.closeButton()?.nativeElement.focus();}
   if(this.resetPanelScroll()){const body=dialog?.querySelector<HTMLElement>('.mega-body');if(body)body.scrollTop=0;this.resetPanelScroll.set(false);}
   const selected=this.selectedCategory();
   if(selected && dialog && (!dialog.contains(this.document.activeElement) || (this.mobile() && this.document.activeElement?.closest('.category-sidebar'))))
    dialog.querySelector<HTMLElement>(this.mobile()?'.back-categories':'.category-all')?.focus();
   if(this.pendingPanelFocus()){dialog?.querySelector<HTMLAnchorElement>('.category-all')?.focus();this.pendingPanelFocus.set(false);}
   const target=this.pendingFocus();
   if(target){this.buttons().find(b=>b.nativeElement.dataset['category']===target)?.nativeElement.focus();this.pendingFocus.set('');}
  });
  destroy.onDestroy(()=>this.close(false));
 }
 open(opener?:HTMLElement){
  if(this.opened())return;
  this.menuProducts.clear();
  this.opener=opener??this.document.activeElement as HTMLElement;this.overflow=this.document.body.style.overflow;
  this.document.body.style.overflow='hidden';this.selectedSlug.set('');this.opened.set(true);this.openedChange.emit(true);
 }
 close(notify=true){
  if(!this.opened())return;
  this.surface()?.nativeElement.close();this.opened.set(false);this.selectedSlug.set('');this.pendingFocus.set('');this.pendingPanelFocus.set(false);this.resetPanelScroll.set(false);
  this.document.body.style.overflow=this.overflow;if(notify)this.openedChange.emit(false);
  this.menuProducts.clear();
  if(notify && this.opener?.isConnected)this.opener.focus({preventScroll:true});
 }
 select(slug:string){if(this.selectedSlug()!==slug){this.selectedSlug.set(slug);this.resetPanelScroll.set(true);}}
 hover(event:PointerEvent,slug:string){if(!this.mobile() && event.pointerType==='mouse')this.select(slug);}
 back(){const slug=this.selectedSlug();this.selectedSlug.set('');this.pendingFocus.set(slug);}
 link(category:string,subcategory?:string){return {commercialCategory:category,subcategory:subcategory??null,buscar:this.search().trim()||null};}
 navigate(){this.navigated.emit();this.close();}
 cancel(event:Event){event.preventDefault();this.close();}
 backdrop(event:MouseEvent){
  const dialog=this.surface()?.nativeElement;if(!dialog||(event.target!==dialog&&event.target!==dialog.querySelector('.drawer-layout')))return;
  const b=dialog.getBoundingClientRect();
  const panel=dialog.querySelector<HTMLElement>('.mega-panel')?.getBoundingClientRect();
  const abovePanel=!this.mobile()&&panel&&event.clientX>=panel.left&&event.clientY<panel.top;
  if(abovePanel||event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)this.close();
 }
 onKey(event:KeyboardEvent){
  const dialog=this.surface()?.nativeElement;if(!dialog)return;
  if(event.key==='Tab'){
   const nodes=[...dialog.querySelectorAll<HTMLElement>('button,a[href]')].filter(e=>e.getClientRects().length>0);
   const first=nodes[0],last=nodes.at(-1);
   if(event.shiftKey&&this.document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&this.document.activeElement===last){event.preventDefault();first?.focus();}
  }
  const index=this.buttons().findIndex(b=>b.nativeElement===this.document.activeElement);
  if(index>=0 && ['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
   event.preventDefault();const count=this.buttons().length;
   const next=event.key==='Home'?0:event.key==='End'?count-1:(index+(event.key==='ArrowDown'?1:-1)+count)%count;
   this.buttons()[next]?.nativeElement.focus();
  }
  if(index>=0&&event.key==='ArrowRight'){
   event.preventDefault();this.select(this.buttons()[index].nativeElement.dataset['category']??'');if(!this.mobile())this.pendingPanelFocus.set(true);
  }
  if(event.key==='ArrowLeft'&&this.selectedCategory()){event.preventDefault();this.back();}
 }
}
