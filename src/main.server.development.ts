import { bootstrapApplication } from '@angular/platform-browser';
import { mergeApplicationConfig } from '@angular/core';
import { App } from './app/app';
import { config } from './app/app.config.server';
import { testHttpConfig } from './environments/test-http.config';

const bootstrap = (context: import('@angular/platform-browser').BootstrapContext) =>
  bootstrapApplication(App, mergeApplicationConfig(config, testHttpConfig), context);

export default bootstrap;
