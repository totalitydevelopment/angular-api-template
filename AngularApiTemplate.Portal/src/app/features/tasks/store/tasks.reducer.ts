import { createFeature, createReducer, on } from '@ngrx/store';

import { ApiError, createApiError } from '../models/api-error';
import type { GetTaskResponse, ListTasksResponse } from '../models/task-contracts';
import { TasksActions } from './tasks.actions';

export type RequestStatus = 'idle' | 'pending' | 'success' | 'failure';

export interface DeleteOperation {
  readonly status: RequestStatus;
  readonly error: ApiError | null;
}

export function createDeleteOperation(
  status: RequestStatus,
  error: ApiError | null = null,
): DeleteOperation {
  return { status, error };
}

export interface TasksState {
  readonly listActive: boolean;
  readonly list: ListTasksResponse;
  readonly listStatus: RequestStatus;
  readonly listError: ApiError | null;
  readonly detailId: string | null;
  readonly detail: GetTaskResponse | null;
  readonly detailStatus: RequestStatus;
  readonly detailError: ApiError | null;
  readonly detailEditing: boolean;
  readonly updateStatus: RequestStatus;
  readonly updateError: ApiError | null;
  readonly createStatus: RequestStatus;
  readonly createError: ApiError | null;
  readonly deletions: Readonly<Record<string, DeleteOperation>>;
}

export const initialTasksState: TasksState = {
  listActive: false,
  list: [],
  listStatus: 'idle',
  listError: null,
  detailId: null,
  detail: null,
  detailStatus: 'idle',
  detailError: null,
  detailEditing: false,
  updateStatus: 'idle',
  updateError: null,
  createStatus: 'idle',
  createError: null,
  deletions: {},
};

// Pending mutations outlive pages. Settled errors belong only to visible task views.
function retainedDeletions(
  deletions: TasksState['deletions'],
  list: ListTasksResponse,
  listActive: boolean,
  detailId: string | null,
): TasksState['deletions'] {
  const visibleIds = new Set(listActive ? list.map((task) => task.id) : []);
  if (detailId !== null) visibleIds.add(detailId);
  return Object.fromEntries(
    Object.entries(deletions).filter(
      ([id, operation]) => operation.status === 'pending' || visibleIds.has(id),
    ),
  );
}

export const tasksFeature = createFeature({
  name: 'tasks',
  reducer: createReducer(
    initialTasksState,
    on(TasksActions.listEntered, (state): TasksState => ({ ...state, listActive: true })),
    on(TasksActions.listClosed, (state): TasksState => ({
      ...state,
      listActive: false,
      deletions: retainedDeletions(state.deletions, state.list, false, state.detailId),
      listStatus: state.listStatus === 'pending' ? 'idle' : state.listStatus,
    })),
    on(TasksActions.listRequested, (state): TasksState => ({
      ...state,
      listStatus: 'pending',
      listError: null,
    })),
    on(TasksActions.listSucceeded, (state, { response }): TasksState => ({
      ...state,
      list: response,
      deletions: retainedDeletions(state.deletions, response, state.listActive, state.detailId),
      listStatus: 'success',
      listError: null,
    })),
    on(TasksActions.listFailed, (state, { error }): TasksState => ({
      ...state,
      listStatus: 'failure',
      listError: error,
    })),
    on(TasksActions.detailRequested, (state, { request }): TasksState => ({
      ...state,
      detailId: request.taskId,
      deletions: retainedDeletions(state.deletions, state.list, state.listActive, request.taskId),
      detail: null,
      detailStatus: 'pending',
      detailError: null,
      detailEditing: false,
      updateStatus: 'idle',
      updateError: null,
    })),
    on(TasksActions.detailSucceeded, (state, { request, response }): TasksState =>
      state.detailId !== request.taskId
        ? state
        : { ...state, detail: response, detailStatus: 'success', detailError: null },
    ),
    on(TasksActions.detailFailed, (state, { request, error }): TasksState =>
      state.detailId !== request.taskId
        ? state
        : { ...state, detail: null, detailStatus: 'failure', detailError: error },
    ),
    on(TasksActions.detailClosed, (state): TasksState => ({
      ...state,
      detailId: null,
      deletions: retainedDeletions(state.deletions, state.list, state.listActive, null),
      detail: null,
      detailStatus: 'idle',
      detailError: null,
      detailEditing: false,
      updateStatus: 'idle',
      updateError: null,
    })),
    on(TasksActions.editStarted, (state): TasksState =>
      state.detail === null
        ? state
        : { ...state, detailEditing: true, updateStatus: 'idle', updateError: null },
    ),
    on(TasksActions.editCancelled, (state): TasksState =>
      state.updateStatus === 'pending'
        ? state
        : { ...state, detailEditing: false, updateStatus: 'idle', updateError: null },
    ),
    on(TasksActions.updateRequested, (state, { request }): TasksState =>
      state.detailId !== request.taskId
        ? state
        : { ...state, updateStatus: 'pending', updateError: null },
    ),
    on(TasksActions.updateSucceeded, (state, { request, response }): TasksState => ({
      ...state,
      list: state.list.map((task) => (task.id === response.id ? response : task)),
      listStatus: 'idle',
      listError: null,
      detail: state.detailId === request.taskId ? response : state.detail,
      detailEditing: state.detailId === request.taskId ? false : state.detailEditing,
      updateStatus: state.detailId === request.taskId ? 'success' : state.updateStatus,
      updateError: state.detailId === request.taskId ? null : state.updateError,
    })),
    on(TasksActions.updateFailed, (state, { request, error }): TasksState =>
      state.detailId !== request.taskId
        ? state
        : { ...state, updateStatus: 'failure', updateError: error },
    ),
    on(TasksActions.createEntered, (state): TasksState =>
      state.createStatus === 'pending'
        ? state
        : { ...state, createStatus: 'idle', createError: null },
    ),
    on(TasksActions.createRequested, (state): TasksState => ({
      ...state,
      createStatus: 'pending',
      createError: null,
    })),
    on(TasksActions.createSucceeded, (state): TasksState => ({
      ...state,
      createStatus: 'success',
      createError: null,
      list: [],
      listStatus: 'idle',
      listError: null,
    })),
    on(TasksActions.createFailed, (state, { error }): TasksState => ({
      ...state,
      createStatus: 'failure',
      createError: error,
    })),
    on(TasksActions.deleteRequested, (state, { request }): TasksState => ({
      ...state,
      deletions: {
        ...state.deletions,
        [request.taskId]: createDeleteOperation('pending'),
      },
    })),
    on(TasksActions.deleteSucceeded, (state, { request }): TasksState => ({
      ...state,
      list: state.list.filter((task) => task.id !== request.taskId),
      listStatus: 'idle',
      listError: null,
      detail: state.detailId === request.taskId ? null : state.detail,
      detailStatus: state.detailId === request.taskId ? 'failure' : state.detailStatus,
      detailError:
        state.detailId === request.taskId
          ? createApiError(404, 'This task was deleted.')
          : state.detailError,
      detailEditing: state.detailId === request.taskId ? false : state.detailEditing,
      updateStatus: state.detailId === request.taskId ? 'idle' : state.updateStatus,
      updateError: state.detailId === request.taskId ? null : state.updateError,
      deletions: Object.fromEntries(
        Object.entries(state.deletions).filter(([id]) => id !== request.taskId),
      ),
    })),
    on(TasksActions.deleteFailed, (state, { request, error }): TasksState => ({
      ...state,
      deletions: retainedDeletions(
        { ...state.deletions, [request.taskId]: createDeleteOperation('failure', error) },
        state.list,
        state.listActive,
        state.detailId,
      ),
    })),
  ),
});
