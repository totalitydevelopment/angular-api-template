import { createActionGroup, emptyProps, props } from '@ngrx/store';

import { ApiError } from '../models/api-error';
import type {
  CreateTaskRequest,
  CreateTaskResponse,
  DeleteTaskRequest,
  GetTaskRequest,
  GetTaskResponse,
  ListTasksResponse,
  ReplaceTaskRequest,
  ReplaceTaskResponse,
} from '../models/task-contracts';
import type { TaskDeleteOrigin } from '../models/tasks-view-models';

export const TasksActions = createActionGroup({
  source: 'Tasks',
  events: {
    'List Entered': emptyProps(),
    'List Closed': emptyProps(),
    'List Requested': emptyProps(),
    'List Succeeded': props<{ generation: number; response: ListTasksResponse }>(),
    'List Failed': props<{ generation: number; error: ApiError }>(),
    'Detail Requested': props<{ request: GetTaskRequest }>(),
    'Detail Succeeded': props<{
      generation: number;
      request: GetTaskRequest;
      response: GetTaskResponse;
    }>(),
    'Detail Failed': props<{ generation: number; request: GetTaskRequest; error: ApiError }>(),
    'Detail Closed': emptyProps(),
    'Edit Started': emptyProps(),
    'Edit Cancelled': emptyProps(),
    'Update Requested': props<{ request: ReplaceTaskRequest }>(),
    'Update Succeeded': props<{
      generation: number;
      request: ReplaceTaskRequest;
      response: ReplaceTaskResponse;
    }>(),
    'Update Failed': props<{ generation: number; request: ReplaceTaskRequest; error: ApiError }>(),
    'Create Entered': emptyProps(),
    'Create Requested': props<{ request: CreateTaskRequest }>(),
    'Create Succeeded': props<{ generation: number; response: CreateTaskResponse }>(),
    'Create Failed': props<{ generation: number; error: ApiError }>(),
    'Delete Requested': props<{ request: DeleteTaskRequest; origin: TaskDeleteOrigin }>(),
    'Delete Succeeded': props<{
      generation: number;
      request: DeleteTaskRequest;
      origin: TaskDeleteOrigin;
    }>(),
    'Delete Failed': props<{ generation: number; request: DeleteTaskRequest; error: ApiError }>(),
  },
});
