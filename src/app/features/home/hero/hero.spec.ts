import { TestBed } from '@angular/core/testing';
import { Hero } from './hero';

describe('Hero composition',()=>{
 it('waits for all three assets before starting their entrance',async()=>{
  const f=TestBed.createComponent(Hero);await f.whenStable();
  const images=f.nativeElement.querySelectorAll('img') as NodeListOf<HTMLImageElement>;
  expect(images).toHaveLength(3);
  expect(f.componentInstance.ready()).toBe(false);
  for(const image of images){Object.defineProperty(image,'complete',{configurable:true,value:true});}
  images[2].dispatchEvent(new Event('load'));await f.whenStable();
  expect(f.nativeElement.querySelector('.hero-visual.ready')).not.toBeNull();
  expect(f.nativeElement.textContent).toContain('Tu marca,');
 });
});
