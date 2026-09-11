import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
@Component({
 selector: 'app-header', imports: [NgOptimizedImage], templateUrl: './header.html',
 styleUrl: './header.scss', changeDetection: ChangeDetectionStrategy.OnPush
})
export class Header {
 readonly menuOpen = signal(false);
 readonly searchOpen = signal(false);
 readonly searchChange = output<string>();
 readonly notice = output<string>();
 closeMenu() { this.menuOpen.set(false); }
}

