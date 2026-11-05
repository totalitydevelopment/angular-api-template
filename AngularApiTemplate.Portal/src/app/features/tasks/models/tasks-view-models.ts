import { ApiError } from './api-error';
import { GetTaskResponse } from './task-contracts';

export interface DeleteViewModel {
  readonly pending: boolean;
  readonly error: ApiError | null;
}
export interface TaskDetailViewModel {
  readonly task: GetTaskResponse | null;
  readonly loading: boolean;
  readonly notFound: boolean;
  readonly error: ApiError | null;
  readonly deletion: DeleteViewModel;
}
export interface TaskCreateViewModel {
  readonly pending: boolean;
  readonly error: ApiError | null;
}

export interface TaskRowViewModel {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly completionLabel: string;
  readonly deletion: DeleteViewModel;
}
export interface TaskListViewModel {
  readonly rows: readonly TaskRowViewModel[];
  readonly loading: boolean;
  readonly empty: boolean;
  readonly error: ApiError | null;
}
