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
export interface CreateTaskResponse extends TaskFields {}

export interface GetTaskRequest {
  readonly taskId: string;
}

export interface GetTaskResponse extends TaskFields {}

export interface ReplaceTaskRequest {
  readonly taskId: string;
  readonly title: string;
  readonly description: string | null;
  readonly isCompleted: boolean;
}

export interface ReplaceTaskResponse extends TaskFields {}

export interface DeleteTaskRequest {
  readonly taskId: string;
}

export interface ListTaskResponse extends TaskFields {}

export type ListTasksResponse = readonly ListTaskResponse[];

export function createTaskRequest(
  title: string,
  description: string | null = null,
): CreateTaskRequest {
  return {
    title,
    description,
  };
}

export function createGetTaskRequest(taskId: string): GetTaskRequest {
  return { taskId };
}

export function createReplaceTaskRequest(
  taskId: string,
  title: string,
  description: string | null = null,
  isCompleted = false,
): ReplaceTaskRequest {
  return {
    taskId,
    title,
    description,
    isCompleted,
  };
}

export function createDeleteTaskRequest(taskId: string): DeleteTaskRequest {
  return { taskId };
}
