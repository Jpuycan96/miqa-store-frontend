import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { QuoteDrawer } from './core/quote/quote-drawer';
@Component({
 selector: 'app-root', imports: [RouterOutlet, QuoteDrawer], templateUrl: './app.html',
 changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {}
