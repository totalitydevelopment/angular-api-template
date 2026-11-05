import { HttpErrorResponse } from '@angular/common/http';

import { ApiError, createApiError, createValidationError } from '../models/api-error';

interface ProblemDetails {
  readonly title?: string | null;
  readonly detail?: string | null;
  readonly status?: number | null;
  readonly errors?: Record<string, string[]> | null;
}

function isValidationErrors(value: unknown): value is Record<string, string[]> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (messages: unknown) =>
        Array.isArray(messages) &&
        messages.every((message: unknown) => typeof message === 'string'),
    )
  );
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}

function isOptionalNumber(value: unknown): value is number | null | undefined {
  return value === undefined || value === null || typeof value === 'number';
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return (
    (!('title' in value) || isOptionalString(value.title)) &&
    (!('detail' in value) || isOptionalString(value.detail)) &&
    (!('status' in value) || isOptionalNumber(value.status)) &&
    (!('errors' in value) ||
      value.errors === undefined ||
      value.errors === null ||
      isValidationErrors(value.errors))
  );
}

export function toApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return createApiError(0, 'The request could not be completed. Please try again.');
  }
  const body: unknown = error.error;
  const problem = isProblemDetails(body) ? body : null;
  const message =
    error.status === 0
      ? 'Cannot reach the API. Check the connection and try again.'
      : error.status === 401
        ? 'Authentication is required. Please sign in and try again.'
        : error.status === 403
          ? 'You do not have permission to perform this action.'
          : error.status === 404
            ? 'This task was not found.'
            : error.status >= 500
              ? 'The server could not complete the request. Please try again.'
              : (problem?.title ?? problem?.detail ?? 'The request could not be completed.');
  const validationErrors = Object.entries(problem?.errors ?? {}).map(([field, messages]) =>
    createValidationError(field, messages),
  );
  return createApiError(error.status, message, validationErrors);
}
