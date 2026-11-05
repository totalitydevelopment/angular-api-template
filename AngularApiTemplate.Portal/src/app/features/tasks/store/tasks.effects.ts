import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  catchError,
  exhaustMap,
  filter,
  groupBy,
  map,
  mergeMap,
  of,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom,
} from 'rxjs';

import { toApiError } from '../services/task-api-error';
import { TasksApiService } from '../services/tasks-api.service';
import { tasksFeature } from './tasks.reducer';
import { TasksActions } from './tasks.actions';

@Injectable()
export class TasksEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(TasksApiService);
  private readonly router = inject(Router);

  private readonly store = inject(Store);

  readonly enterList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.listEntered),
      map(() => TasksActions.listRequested()),
    ),
  );
  readonly list$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.listRequested),
      switchMap(() =>
        this.api.list().pipe(
          map((response) => TasksActions.listSucceeded({ response })),
          catchError((error: unknown) => of(TasksActions.listFailed({ error: toApiError(error) }))),
          // Mutations invalidate an in-flight snapshot; a visible list is reloaded below.
          takeUntil(
            this.actions$.pipe(
              ofType(
                TasksActions.listClosed,
                TasksActions.createSucceeded,
                TasksActions.deleteSucceeded,
              ),
            ),
          ),
        ),
      ),
    ),
  );
  readonly refreshAfterMutation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.createSucceeded, TasksActions.deleteSucceeded),
      withLatestFrom(this.store.select(tasksFeature.selectListActive)),
      filter(([, active]) => active),
      map(() => TasksActions.listRequested()),
    ),
  );

  // Reads follow the current route; leaving or deleting it cancels stale responses.
  readonly detail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.detailRequested),
      switchMap(({ request }) =>
        this.api.get(request).pipe(
          map((response) => TasksActions.detailSucceeded({ request, response })),
          catchError((error: unknown) =>
            of(TasksActions.detailFailed({ request, error: toApiError(error) })),
          ),
          takeUntil(
            this.actions$.pipe(
              ofType(TasksActions.detailClosed, TasksActions.deleteSucceeded),
              filter(
                (action) =>
                  action.type === TasksActions.detailClosed.type ||
                  action.request.taskId === request.taskId,
              ),
            ),
          ),
        ),
      ),
    ),
  );

  // Ignore duplicate submits until the current create settles; mutations are never retried.
  readonly create$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.createRequested),
      exhaustMap(({ request }) =>
        this.api.create(request).pipe(
          map((response) => TasksActions.createSucceeded({ response })),
          catchError((error: unknown) =>
            of(TasksActions.createFailed({ error: toApiError(error) })),
          ),
        ),
      ),
    ),
  );

  // Different IDs run concurrently; duplicates of one ID share an exhaust gate.
  // A group closes on settlement so deleted IDs do not accumulate subscriptions.
  readonly delete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.deleteRequested),
      groupBy((action) => action.request.taskId, {
        duration: (group) =>
          this.actions$.pipe(
            ofType(TasksActions.deleteSucceeded, TasksActions.deleteFailed),
            filter((action) => action.request.taskId === group.key),
            take(1),
          ),
      }),
      mergeMap((group) =>
        group.pipe(
          exhaustMap(({ request, origin }) =>
            this.api.delete(request).pipe(
              map(() => TasksActions.deleteSucceeded({ request, origin })),
              catchError((error: unknown) =>
                of(TasksActions.deleteFailed({ request, error: toApiError(error) })),
              ),
            ),
          ),
        ),
      ),
    ),
  );

  readonly afterCreate$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(TasksActions.createSucceeded),
        tap(({ response }) => {
          if (currentPath(this.router.url) === '/tasks/create')
            void this.router.navigate(['/tasks', response.id]);
        }),
      ),
    { dispatch: false },
  );

  readonly afterDelete$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(TasksActions.deleteSucceeded),
        tap(({ request, origin }) => {
          const path = currentPath(this.router.url);
          if (
            origin === 'detail' &&
            (path === `/tasks/${request.taskId}` ||
              path === `/tasks/${encodeURIComponent(request.taskId)}`)
          ) {
            void this.router.navigate(['/tasks']);
          }
        }),
      ),
    { dispatch: false },
  );
}

function currentPath(url: string): string {
  return url.split(/[?#;]/)[0] ?? '';
}
