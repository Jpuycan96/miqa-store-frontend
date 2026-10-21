import { bootstrapApplication } from '@angular/platform-browser';
import { mergeApplicationConfig } from '@angular/core';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { testHttpConfig } from './environments/test-http.config';

bootstrapApplication(App, mergeApplicationConfig(appConfig, testHttpConfig))
  .catch((err: unknown) => console.error(err));
