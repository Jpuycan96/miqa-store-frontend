import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HomeProject } from '../../../shared/models/home-project';
import { HOME_PROJECTS } from './projects.data';

@Component({
  selector: 'app-projects',
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Projects {
  readonly projects = input<readonly HomeProject[]>(HOME_PROJECTS);
}
