import { createSelector } from '@ngrx/store';

import { GetTaskResponse, ListTaskResponse } from '../models/task-contracts';
import {
  DeleteViewModel,
  TaskCreateViewModel,
  TaskDetailItemViewModel,
  TaskDetailViewModel,
  TaskListViewModel,
  TaskRowViewModel,
} from '../models/tasks-view-models';
import { DeleteOperation, tasksFeature } from './tasks.reducer';

function toCompletionLabel(isCompleted: boolean): string {
  return isCompleted ? 'Completed' : 'Not completed';
}

function toDeleteViewModel(operation: DeleteOperation | undefined): DeleteViewModel {
  return {
    pending: operation?.status === 'pending',
    error: operation?.error ?? null,
  };
}

function toTaskDetailItemViewModel(detail: GetTaskResponse): TaskDetailItemViewModel {
  return {
    id: detail.id,
    title: detail.title,
    description: detail.description ?? 'No description.',
    rawDescription: detail.description,
    isCompleted: detail.isCompleted,
    completionLabel: toCompletionLabel(detail.isCompleted),
  };
}

function toTaskRowViewModel(
  task: ListTaskResponse,
  deletions: Readonly<Record<string, DeleteOperation>>,
): TaskRowViewModel {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    completionLabel: toCompletionLabel(task.isCompleted),
    deletion: toDeleteViewModel(deletions[task.id]),
  };
}

export const selectCreateViewModel = createSelector(
  tasksFeature.selectCreateStatus,
  tasksFeature.selectCreateError,
  (status, error): TaskCreateViewModel => ({
    pending: status === 'pending',
    error,
  }),
);

export const selectDetailViewModel = createSelector(
  tasksFeature.selectDetailId,
  tasksFeature.selectDetail,
  tasksFeature.selectDetailStatus,
  tasksFeature.selectDetailError,
  tasksFeature.selectDetailEditing,
  tasksFeature.selectUpdateStatus,
  tasksFeature.selectUpdateError,
  tasksFeature.selectDeletions,
  (
    detailId,
    detail,
    detailStatus,
    detailError,
    detailEditing,
    updateStatus,
    updateError,
    deletions,
  ): TaskDetailViewModel => ({
    task: detail === null ? null : toTaskDetailItemViewModel(detail),
    loading: detailStatus === 'pending',
    notFound: detailError?.status === 404,
    error: detailError,
    update: {
      editing: detailEditing,
      pending: updateStatus === 'pending',
      error: updateError,
    },
    deletion: toDeleteViewModel(detailId === null ? undefined : deletions[detailId]),
  }),
);

export const selectListViewModel = createSelector(
  tasksFeature.selectList,
  tasksFeature.selectListStatus,
  tasksFeature.selectListError,
  tasksFeature.selectDeletions,
  (list, listStatus, listError, deletions): TaskListViewModel => ({
    rows: list.map((task) => toTaskRowViewModel(task, deletions)),
    loading: listStatus === 'pending',
    empty: listStatus === 'success' && list.length === 0,
    error: listError,
  }),
);
