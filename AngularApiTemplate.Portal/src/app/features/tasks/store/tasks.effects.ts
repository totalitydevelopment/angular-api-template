import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  catchError,
  defer,
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

import { selectSessionGeneration, sessionChanged } from '../../../core/auth/session.state';
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
        defer(() => {
          const generation = this.store.selectSignal(selectSessionGeneration)();
          return this.api.list().pipe(
            map((response) => TasksActions.listSucceeded({ generation, response })),
            catchError((error: unknown) =>
              of(TasksActions.listFailed({ generation, error: toApiError(error) })),
            ),
            // Mutations invalidate an in-flight snapshot; a visible list is reloaded below.
            takeUntil(
              this.actions$.pipe(
                ofType(
                  TasksActions.listClosed,
                  TasksActions.createSucceeded,
                  TasksActions.updateSucceeded,
                  TasksActions.deleteSucceeded,
                ),
                filter(
                  (action) =>
                    action.type === TasksActions.listClosed.type ||
                    action.generation === this.store.selectSignal(selectSessionGeneration)(),
                ),
              ),
            ),
            takeUntil(this.actions$.pipe(ofType(sessionChanged))),
          );
        }),
      ),
    ),
  );
  readonly refreshAfterMutation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        TasksActions.createSucceeded,
        TasksActions.updateSucceeded,
        TasksActions.deleteSucceeded,
      ),
      filter((action) => action.generation === this.store.selectSignal(selectSessionGeneration)()),
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
        defer(() => {
          const generation = this.store.selectSignal(selectSessionGeneration)();
          return this.api.get(request).pipe(
            map((response) => TasksActions.detailSucceeded({ generation, request, response })),
            catchError((error: unknown) =>
              of(TasksActions.detailFailed({ generation, request, error: toApiError(error) })),
            ),
            takeUntil(
              this.actions$.pipe(
                ofType(TasksActions.detailClosed, TasksActions.deleteSucceeded),
                filter(
                  (action) =>
                    action.type === TasksActions.detailClosed.type ||
                    (action.generation === this.store.selectSignal(selectSessionGeneration)() &&
                      action.request.taskId === request.taskId),
                ),
              ),
            ),
            takeUntil(this.actions$.pipe(ofType(sessionChanged))),
          );
        }),
      ),
    ),
  );

  // Ignore duplicate submits until the current update settles; mutations are never retried.
  readonly update$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.updateRequested),
      exhaustMap(({ request }) =>
        defer(() => {
          const generation = this.store.selectSignal(selectSessionGeneration)();
          return this.api.replace(request).pipe(
            map((response) => TasksActions.updateSucceeded({ generation, request, response })),
            catchError((error: unknown) =>
              of(TasksActions.updateFailed({ generation, request, error: toApiError(error) })),
            ),
            takeUntil(this.actions$.pipe(ofType(sessionChanged))),
          );
        }),
      ),
    ),
  );

  // Ignore duplicate submits until the current create settles; mutations are never retried.
  readonly create$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.createRequested),
      exhaustMap(({ request }) =>
        defer(() => {
          const generation = this.store.selectSignal(selectSessionGeneration)();
          return this.api.create(request).pipe(
            map((response) => TasksActions.createSucceeded({ generation, response })),
            catchError((error: unknown) =>
              of(TasksActions.createFailed({ generation, error: toApiError(error) })),
            ),
            takeUntil(this.actions$.pipe(ofType(sessionChanged))),
          );
        }),
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
            ofType(TasksActions.deleteSucceeded, TasksActions.deleteFailed, sessionChanged),
            filter(
              (action) =>
                action.type === sessionChanged.type ||
                (action.generation === this.store.selectSignal(selectSessionGeneration)() &&
                  action.request.taskId === group.key),
            ),
            take(1),
          ),
      }),
      mergeMap((group) =>
        group.pipe(
          exhaustMap(({ request, origin }) =>
            defer(() => {
              const generation = this.store.selectSignal(selectSessionGeneration)();
              return this.api.delete(request).pipe(
                map(() => TasksActions.deleteSucceeded({ generation, request, origin })),
                catchError((error: unknown) =>
                  of(TasksActions.deleteFailed({ generation, request, error: toApiError(error) })),
                ),
                takeUntil(this.actions$.pipe(ofType(sessionChanged))),
              );
            }),
          ),
        ),
      ),
    ),
  );

  readonly afterCreate$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(TasksActions.createSucceeded),
        filter(
          (action) => action.generation === this.store.selectSignal(selectSessionGeneration)(),
        ),
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
        filter(
          (action) => action.generation === this.store.selectSignal(selectSessionGeneration)(),
        ),
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
