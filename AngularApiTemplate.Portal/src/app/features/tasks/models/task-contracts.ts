export interface TaskFields {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly isCompleted: boolean;
}

export interface CreateTaskRequest {
  readonly title: string;
  readonly description?: string | null;
}

// The API intentionally returns the same TaskResponse shape for these operations.
export type CreateTaskResponse = TaskFields;
export interface GetTaskRequest {
  readonly taskId: string;
}
export type GetTaskResponse = TaskFields;
export interface DeleteTaskRequest {
  readonly taskId: string;
}

export type ListTaskResponse = TaskFields;
export type ListTasksResponse = readonly ListTaskResponse[];
