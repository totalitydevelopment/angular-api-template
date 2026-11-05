import { inject, Injectable } from '@angular/core';

import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import {
  createGetTaskRequest,
  CreateTaskRequest,
  DeleteTaskRequest,
  GetTaskRequest,
  ReplaceTaskRequest,
} from '../models/task-contracts';
import type {
  TaskCreateViewModel,
  TaskDeleteOrigin,
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
  private readonly listActive = this.store.selectSignal(tasksFeature.selectListActive);
  private readonly listStatus = this.store.selectSignal(tasksFeature.selectListStatus);
  private readonly detailId = this.store.selectSignal(tasksFeature.selectDetailId);
  private readonly createStatus = this.store.selectSignal(tasksFeature.selectCreateStatus);
  private readonly updateStatus = this.store.selectSignal(tasksFeature.selectUpdateStatus);
  private readonly deletions = this.store.selectSignal(tasksFeature.selectDeletions);

  readonly createViewModel$: Observable<TaskCreateViewModel> =
    this.store.select(selectCreateViewModel);
  readonly detailViewModel$: Observable<TaskDetailViewModel> =
    this.store.select(selectDetailViewModel);
  readonly listViewModel$: Observable<TaskListViewModel> = this.store.select(selectListViewModel);

  openList(): void {
    if (!this.listActive()) {
      this.store.dispatch(TasksActions.listEntered());
    }
  }

  closeList(): void {
    this.store.dispatch(TasksActions.listClosed());
  }

  refreshList(): void {
    if (this.listStatus() !== 'pending') {
      this.store.dispatch(TasksActions.listRequested());
    }
  }

  openCreate(): void {
    this.store.dispatch(TasksActions.createEntered());
  }

  openDetail(request: GetTaskRequest): void {
    this.store.dispatch(TasksActions.detailRequested({ request }));
  }

  retryDetail(): void {
    const taskId = this.detailId();
    if (taskId !== null) {
      this.store.dispatch(TasksActions.detailRequested({ request: createGetTaskRequest(taskId) }));
    }
  }

  closeDetail(): void {
    this.store.dispatch(TasksActions.detailClosed());
  }

  startEdit(): void {
    this.store.dispatch(TasksActions.editStarted());
  }

  cancelEdit(): void {
    this.store.dispatch(TasksActions.editCancelled());
  }

  update(request: ReplaceTaskRequest): void {
    if (this.updateStatus() !== 'pending') {
      this.store.dispatch(TasksActions.updateRequested({ request }));
    }
  }

  create(request: CreateTaskRequest): void {
    if (this.createStatus() !== 'pending') {
      this.store.dispatch(TasksActions.createRequested({ request }));
    }
  }

  delete(request: DeleteTaskRequest, origin: TaskDeleteOrigin): void {
    if (this.deletions()[request.taskId]?.status !== 'pending') {
      this.store.dispatch(TasksActions.deleteRequested({ request, origin }));
    }
  }
}
