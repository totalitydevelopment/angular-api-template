import { createActionGroup, emptyProps, props } from '@ngrx/store';

import { ApiError } from '../models/api-error';
import type {
  CreateTaskRequest,
  CreateTaskResponse,
  DeleteTaskRequest,
  GetTaskRequest,
  GetTaskResponse,
  ListTasksResponse,
} from '../models/task-contracts';

export const TasksActions = createActionGroup({
  source: 'Tasks',
  events: {
    'List Entered': emptyProps(),
    'List Closed': emptyProps(),
    'List Requested': emptyProps(),
    'List Succeeded': props<{ response: ListTasksResponse }>(),
    'List Failed': props<{ error: ApiError }>(),
    'Detail Requested': props<{ request: GetTaskRequest }>(),
    'Detail Succeeded': props<{ request: GetTaskRequest; response: GetTaskResponse }>(),
    'Detail Failed': props<{ request: GetTaskRequest; error: ApiError }>(),
    'Detail Closed': emptyProps(),
    'Create Entered': emptyProps(),
    'Create Requested': props<{ request: CreateTaskRequest }>(),
    'Create Succeeded': props<{ response: CreateTaskResponse }>(),
    'Create Failed': props<{ error: ApiError }>(),
    'Delete Requested': props<{ request: DeleteTaskRequest; origin: 'list' | 'detail' }>(),
    'Delete Succeeded': props<{ request: DeleteTaskRequest; origin: 'list' | 'detail' }>(),
    'Delete Failed': props<{ request: DeleteTaskRequest; error: ApiError }>(),
  },
});
