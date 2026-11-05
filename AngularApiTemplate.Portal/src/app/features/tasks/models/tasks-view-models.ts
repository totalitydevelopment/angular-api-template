import { ApiError } from './api-error';

export type TaskDeleteOrigin = 'list' | 'detail';

export interface DeleteViewModel {
  readonly pending: boolean;
  readonly error: ApiError | null;
}

export interface UpdateViewModel {
  readonly editing: boolean;
  readonly pending: boolean;
  readonly error: ApiError | null;
}

export interface TaskDetailItemViewModel {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly rawDescription: string | null;
  readonly isCompleted: boolean;
  readonly completionLabel: string;
}

export interface TaskDetailViewModel {
  readonly task: TaskDetailItemViewModel | null;
  readonly loading: boolean;
  readonly notFound: boolean;
  readonly error: ApiError | null;
  readonly update: UpdateViewModel;
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
