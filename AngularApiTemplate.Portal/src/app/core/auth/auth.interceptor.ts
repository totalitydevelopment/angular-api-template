import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { Actions, ofType } from '@ngrx/effects';
import { catchError, defer, switchMap, takeUntil, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api-base-url';
import { AuthService } from './auth.service';
import { sessionChanged } from './session.state';

export function isApiRequest(url: string, base: string): boolean {
  const target = new URL(url, window.location.origin);
  const api = new URL(base, window.location.origin);
  const path = api.pathname.replace(/\/$/, '');
  return (
    target.origin === api.origin &&
    (target.pathname === path || target.pathname.startsWith(path + '/'))
  );
}

export const customerTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const base = inject(API_BASE_URL);
  const actions = inject(Actions);
  if (!auth.config.enabled || !isApiRequest(request.url, base)) return next(request);
  return defer(() => auth.accessToken()).pipe(
    catchError(() =>
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Sign in required' })),
    ),
    switchMap((token) => next(request.clone({ setHeaders: { Authorization: 'Bearer ' + token } }))),
    takeUntil(actions.pipe(ofType(sessionChanged))),
  );
};
