import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { QuoteStore } from './core/quote/quote-store';
@Component({
 selector: 'app-root', imports: [RouterOutlet], templateUrl: './app.html',
 styles: `.quote-toast { position: fixed; z-index: 100; bottom: 24px; left: 50%; transform: translateX(-50%); width: max-content; max-width: calc(100% - 32px); padding: 14px 22px; border-radius: 14px; background: var(--miqa-navy); color: white; font-size: 14px; pointer-events: none; visibility: hidden; } .quote-toast.visible { visibility: visible; }`,
 changeDetection: ChangeDetectionStrategy.OnPush
})
export class App { readonly quote = inject(QuoteStore); }
