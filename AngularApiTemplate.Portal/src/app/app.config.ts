import { provideHttpClient } from '@angular/common/http';
import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { API_BASE_URL } from './core/config/api-base-url';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    provideStore(
      {},
      {
        runtimeChecks: {
          strictStateImmutability: true,
          strictActionImmutability: true,
          strictStateSerializability: true,
          strictActionSerializability: true,
        },
      },
    ),
    provideEffects(),
  ],
};
