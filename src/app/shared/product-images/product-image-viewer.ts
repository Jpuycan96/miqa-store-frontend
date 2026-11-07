import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ImageSource, productImages } from './product-images';
import { ProductImageView } from './product-image';

@Component({
  selector:'app-product-image-viewer', imports:[ProductImageView],
  changeDetection:ChangeDetectionStrategy.OnPush,
  template:`@if (product(); as product) { <dialog #surface aria-labelledby="image-viewer-title" (cancel)="cancel($event)" (click)="backdrop($event)" (keydown)="onKey($event)">
      <section class="viewer-content">
        <header><h2 id="image-viewer-title">{{ product.name }}</h2><button #closeButton type="button" class="close-viewer" aria-label="Cerrar visor de imágenes" (click)="close()">×</button></header>
        <div class="photo"><app-product-image [src]="active()?.url ?? ''" [alt]="active()?.altText || product.name" sizes="90vw" /></div>
        @if (images().length > 1) {
          <div class="viewer-controls"><button type="button" aria-label="Imagen anterior" (click)="move(-1)">‹</button>
            <div class="dots" role="group" aria-label="Elegir imagen ampliada">
              @for (image of images(); track image.id; let i = $index) {
                <button type="button" [attr.aria-label]="'Imagen ' + (i + 1) + ' de ' + images().length" [attr.aria-pressed]="i === index()" (click)="index.set(i)"><span aria-hidden="true"></span></button>
              }
            </div><button type="button" aria-label="Imagen siguiente" (click)="move(1)">›</button>
          </div>
          <p class="image-count" role="status">{{ index() + 1 }} / {{ images().length }}</p>
        }
      </section>
  </dialog> }`,
  styles:`
    :host{display:contents}
    dialog{position:fixed;inset:0;width:min(960px,calc(100vw - 24px));height:min(820px,90dvh);max-height:90dvh;margin:auto;padding:0;border:0;border-radius:18px;background:#fff;color:#061b4f}
    dialog::backdrop{background:rgb(6 27 79 / .65)}
    .viewer-content{height:100%;display:flex;flex-direction:column;padding:16px;box-sizing:border-box}
    header{display:flex;align-items:center;gap:12px;flex-shrink:0}
    h2{flex:1;min-width:0;font-size:18px;margin:0;overflow-wrap:anywhere}
    button{min-width:44px;min-height:44px;flex-shrink:0;border:0;border-radius:50%;background:#eef7f8;color:#061b4f;cursor:pointer;font:inherit;font-size:24px}
    button:focus-visible{outline:3px solid #075b87;outline-offset:-3px}
    .photo{min-height:0;flex:1;background:#fff;--product-image-padding:12px;--product-image-scale:1}
    .viewer-controls{display:flex;align-items:center;justify-content:center;gap:8px;flex-shrink:0}
    .dots{display:flex;flex-wrap:wrap;justify-content:center;min-width:0}
    .dots button{display:grid;place-items:center;background:transparent}
    .dots span{display:block;width:10px;height:10px;border:1px solid #506779;border-radius:50%;background:#fff}
    .dots [aria-pressed=true] span{background:#00d9e8;border-color:#075b87}
    .image-count{text-align:center;font-size:12px;margin:4px 0 0;color:#061b4f}
    @media(max-width:599px){.viewer-content{padding:10px}h2{font-size:16px}.viewer-controls{gap:0}.dots button{min-width:36px}}
  `
})
export class ProductImageViewer {
  readonly product=signal<ImageSource|null>(null);
  readonly images=computed(()=>this.product()?productImages(this.product()!):[]);
  readonly index=signal(0);
  readonly active=computed(()=>this.images().at(this.index()));
  private readonly document=inject(DOCUMENT);
  private readonly surface=viewChild<ElementRef<HTMLDialogElement>>('surface');
  private readonly closeButton=viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private opener?: HTMLElement;
  private overflow='';
  constructor(){
    afterRenderEffect(()=>{
      if(this.product() && !this.surface()?.nativeElement.open){
        this.surface()?.nativeElement.showModal();this.closeButton()?.nativeElement.focus();
      }
    });
    inject(DestroyRef).onDestroy(()=>this.close());
  }
  open(product:ImageSource,index=0){
    if(!this.product()){
      this.opener=this.document.activeElement as HTMLElement;
      this.overflow=this.document.body.style.overflow;
      this.document.body.style.overflow='hidden';
    }
    this.product.set(product);this.index.set(Math.max(0,Math.min(index,productImages(product).length-1)));
  }
  close(){
    if(!this.product())return;
    this.surface()?.nativeElement.close();this.product.set(null);
    this.document.body.style.overflow=this.overflow;
    if(this.opener?.isConnected)this.opener.focus({preventScroll:true});
  }
  cancel(event:Event){event.preventDefault();this.close();}
  backdrop(event:MouseEvent){
    const dialog=this.surface()?.nativeElement;
    if(event.target!==dialog || !dialog)return;
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)this.close();
  }
  move(delta:number){const count=this.images().length;if(count>1)this.index.set((this.index()+delta+count)%count);}
  onKey(event:KeyboardEvent){
    if(event.key==='Tab'){
      const buttons=this.surface()?.nativeElement.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
      const first=buttons?.[0],last=buttons?.[buttons.length-1];
      if(event.shiftKey && this.document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey && this.document.activeElement===last){event.preventDefault();first?.focus();}
    }
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();this.move(event.key==='ArrowRight'?1:-1);}
  }
}
