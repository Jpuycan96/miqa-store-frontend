import { ChangeDetectionStrategy, Component } from '@angular/core';
import { contactWhatsAppUrl } from '../config/whatsapp';
@Component({
 selector:'app-floating-whatsapp',
 host:{role:'complementary','aria-label':'Contacto por WhatsApp'},
 template:`<a class="whatsapp" [href]="url" target="_blank" rel="noopener noreferrer" aria-label="Hablar por WhatsApp (abre una nueva pestaña)"><svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16 .8A15 15 0 0 0 3 23.3L.8 31.2l8.1-2.1A15 15 0 1 0 16 .8Zm0 27.3a12.2 12.2 0 0 1-6.2-1.7l-.5-.3-4.8 1.3 1.3-4.6-.3-.5A12.3 12.3 0 1 1 16 28.1Zm6.7-9.2c-.4-.2-2.2-1.1-2.6-1.2-.3-.1-.6-.2-.8.2-.3.4-1 1.2-1.2 1.4-.2.3-.4.3-.8.1-2.2-1.1-3.7-2-5.2-4.6-.4-.7.4-.6 1.1-2 .1-.3.1-.5 0-.7l-1.2-2.8c-.3-.7-.6-.6-.8-.6h-.7c-.3 0-.7.1-1 .5-1 1-1.5 2.1-1.5 3.5 0 2.1 1.5 4.1 1.7 4.4.2.3 3 4.6 7.3 6.4 2.7 1.2 3.8 1.3 5.2 1.1.8-.1 2.2-.9 2.5-1.8.3-.9.3-1.6.2-1.8-.1-.2-.4-.3-.8-.5Z"/></svg></a>`,
 styles:`.whatsapp{position:fixed;right:24px;bottom:max(24px,env(safe-area-inset-bottom));z-index:25;display:grid;place-items:center;width:54px;height:54px;border-radius:50%;background:#25D366;color:white;box-shadow:0 3px 12px #061b4f20;transition:background .18s}.whatsapp:hover{background:#1EBE5D}.whatsapp svg{width:29px;height:29px}.whatsapp:focus-visible{outline:3px solid #061b4f;outline-offset:4px}@media(max-width:767px){.whatsapp{right:12px;bottom:max(12px,env(safe-area-inset-bottom));width:48px;height:48px}}`,
 changeDetection:ChangeDetectionStrategy.OnPush
})
export class FloatingWhatsApp { readonly url=contactWhatsAppUrl(); }
