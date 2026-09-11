import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HomeService } from '../../../shared/models/home-service';
import { HOME_SERVICES } from './services.data';

@Component({
  selector: 'app-services',
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './services.html',
  styleUrl: './services.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Services {
  readonly services = input<readonly HomeService[]>(HOME_SERVICES);
}
