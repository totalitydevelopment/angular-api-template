import { inject, Injectable } from '@angular/core';

import { Store } from '@ngrx/store';
import { Observable, take } from 'rxjs';

import { CreateTaskRequest, DeleteTaskRequest, GetTaskRequest } from '../models/task-contracts';
import type {
  TaskCreateViewModel,
  TaskDetailViewModel,
  TaskListViewModel,
} from '../models/tasks-view-models';
import { TasksActions } from './tasks.actions';
import { tasksFeature } from './tasks.reducer';
import {
  selectCreateViewModel,
  selectDetailViewModel,
  selectListViewModel,
} from './tasks.selectors';

@Injectable()
export class TasksFacade {
  private readonly store = inject(Store);
  readonly createViewModel$: Observable<TaskCreateViewModel> =
    this.store.select(selectCreateViewModel);
  readonly detailViewModel$: Observable<TaskDetailViewModel> =
    this.store.select(selectDetailViewModel);

  readonly listViewModel$: Observable<TaskListViewModel> = this.store.select(selectListViewModel);

  openList(): void {
    this.store
      .select(tasksFeature.selectListActive)
      .pipe(take(1))
      .subscribe((active) => {
        if (!active) this.store.dispatch(TasksActions.listEntered());
      });
  }
  closeList(): void {
    this.store.dispatch(TasksActions.listClosed());
  }
  refreshList(): void {
    this.store
      .select(tasksFeature.selectListStatus)
      .pipe(take(1))
      .subscribe((status) => {
        if (status !== 'pending') this.store.dispatch(TasksActions.listRequested());
      });
  }
  openCreate(): void {
    this.store.dispatch(TasksActions.createEntered());
  }
  openDetail(request: GetTaskRequest): void {
    this.store.dispatch(TasksActions.detailRequested({ request }));
  }
  closeDetail(): void {
    this.store.dispatch(TasksActions.detailClosed());
  }
  create(request: CreateTaskRequest): void {
    this.store
      .select(tasksFeature.selectCreateStatus)
      .pipe(take(1))
      .subscribe((status) => {
        if (status !== 'pending') this.store.dispatch(TasksActions.createRequested({ request }));
      });
  }
  delete(request: DeleteTaskRequest, origin: 'list' | 'detail'): void {
    this.store
      .select(tasksFeature.selectDeletions)
      .pipe(take(1))
      .subscribe((deletions) => {
        if (deletions[request.taskId]?.status !== 'pending') {
          this.store.dispatch(TasksActions.deleteRequested({ request, origin }));
        }
      });
  }
}
