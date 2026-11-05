export interface ValidationError {
  readonly field: string;
  readonly messages: readonly string[];
}

export interface ApiError {
  readonly status: number;
  readonly message: string;
  readonly validationErrors: readonly ValidationError[];
}

export function createValidationError(field: string, messages: readonly string[]): ValidationError {
  return { field, messages };
}

export function createApiError(
  status: number,
  message: string,
  validationErrors: readonly ValidationError[] = [],
): ApiError {
  return {
    status,
    message,
    validationErrors,
  };
}
