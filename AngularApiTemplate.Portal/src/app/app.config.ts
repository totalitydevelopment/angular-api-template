import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { customerTokenInterceptor } from './core/auth/auth.interceptor';
import { sessionBoundary, sessionReducer } from './core/auth/session.state';
import { API_BASE_URL } from './core/config/api-base-url';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([customerTokenInterceptor])),
    provideAppInitializer(() => inject(AuthService).initialize()),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    provideStore(
      { session: sessionReducer },
      {
        metaReducers: [sessionBoundary],
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
