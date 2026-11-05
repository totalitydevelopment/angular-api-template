import { createSelector } from '@ngrx/store';

import {
  TaskCreateViewModel,
  TaskDetailViewModel,
  TaskListViewModel,
} from '../models/tasks-view-models';
import { tasksFeature } from './tasks.reducer';

export const selectCreateViewModel = createSelector(
  tasksFeature.selectCreateStatus,
  tasksFeature.selectCreateError,
  (status, error): TaskCreateViewModel => ({ pending: status === 'pending', error }),
);
export const selectDetailViewModel = createSelector(
  tasksFeature.selectDetailId,
  tasksFeature.selectDetail,
  tasksFeature.selectDetailStatus,
  tasksFeature.selectDetailError,
  tasksFeature.selectDeletions,
  (detailId, detail, detailStatus, detailError, deletions): TaskDetailViewModel => ({
    task: detail,
    loading: detailStatus === 'pending',
    notFound: detailError?.status === 404,
    error: detailError,
    deletion: {
      pending: detailId !== null && deletions[detailId]?.status === 'pending',
      error: detailId === null ? null : (deletions[detailId]?.error ?? null),
    },
  }),
);

export const selectListViewModel = createSelector(
  tasksFeature.selectList,
  tasksFeature.selectListStatus,
  tasksFeature.selectListError,
  tasksFeature.selectDeletions,
  (list, listStatus, listError, deletions): TaskListViewModel => ({
    rows: list.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      completionLabel: task.isCompleted ? 'Completed' : 'Not completed',
      deletion: {
        pending: deletions[task.id]?.status === 'pending',
        error: deletions[task.id]?.error ?? null,
      },
    })),
    loading: listStatus === 'pending',
    empty: listStatus === 'success' && list.length === 0,
    error: listError,
  }),
);
