/** Minimal native-dialog lifecycle for jsdom; browser behavior is covered by the local visual harness. */
export function mockNativeDialogs(): () => void {
 const modal=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'showModal');
 const close=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'close');
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,writable:true,value:function(this:HTMLDialogElement){this.open=true;}});
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,writable:true,value:function(this:HTMLDialogElement){this.open=false;}});
 return ()=>{
  if(modal)Object.defineProperty(HTMLDialogElement.prototype,'showModal',modal);else Reflect.deleteProperty(HTMLDialogElement.prototype,'showModal');
  if(close)Object.defineProperty(HTMLDialogElement.prototype,'close',close);else Reflect.deleteProperty(HTMLDialogElement.prototype,'close');
 };
}
