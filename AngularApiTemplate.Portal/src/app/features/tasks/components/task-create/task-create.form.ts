import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { CreateTaskRequest, createTaskRequest } from '../../models/task-contracts';

export const TASK_VALIDATION_LIMITS = {
  titleMaxLength: 200,
  descriptionMaxLength: 2000,
} as const;

export const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value: unknown = control.value;
  return typeof value === 'string' && value.trim().length > 0 ? null : { required: true };
};

export function trimmedMaxLength(maxLength: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: unknown = control.value;
    if (typeof value !== 'string') return null;
    const actualLength = value.trim().length;
    return actualLength <= maxLength
      ? null
      : { maxlength: { requiredLength: maxLength, actualLength } };
  };
}

export type TaskCreateForm = FormGroup<{
  title: FormControl<string>;
  description: FormControl<string>;
}>;

export type TaskCreateFormValue = ReturnType<TaskCreateForm['getRawValue']>;

export function createTaskForm(): TaskCreateForm {
  return new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [trimmedRequired, trimmedMaxLength(TASK_VALIDATION_LIMITS.titleMaxLength)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(TASK_VALIDATION_LIMITS.descriptionMaxLength)],
    }),
  });
}

export function toCreateTaskRequest(values: TaskCreateFormValue): CreateTaskRequest {
  return createTaskRequest(
    values.title.trim(),
    values.description === '' ? null : values.description,
  );
}
