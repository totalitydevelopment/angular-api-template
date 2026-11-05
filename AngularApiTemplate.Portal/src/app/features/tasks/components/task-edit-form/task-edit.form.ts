import { FormControl, FormGroup, Validators } from '@angular/forms';

import { createReplaceTaskRequest, ReplaceTaskRequest } from '../../models/task-contracts';
import { TaskDetailItemViewModel } from '../../models/tasks-view-models';
import {
  TASK_VALIDATION_LIMITS,
  trimmedMaxLength,
  trimmedRequired,
} from '../task-create/task-create.form';

export type TaskEditForm = FormGroup<{
  title: FormControl<string>;
  description: FormControl<string>;
  isCompleted: FormControl<boolean>;
}>;

export type TaskEditFormValue = ReturnType<TaskEditForm['getRawValue']>;

export function createTaskEditForm(): TaskEditForm {
  return new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [trimmedRequired, trimmedMaxLength(TASK_VALIDATION_LIMITS.titleMaxLength)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(TASK_VALIDATION_LIMITS.descriptionMaxLength)],
    }),
    isCompleted: new FormControl(false, { nonNullable: true }),
  });
}

export function resetTaskEditForm(form: TaskEditForm, task: TaskDetailItemViewModel): void {
  form.reset({
    title: task.title,
    description: task.rawDescription ?? '',
    isCompleted: task.isCompleted,
  });
}

export function toReplaceTaskRequest(
  taskId: string,
  values: TaskEditFormValue,
): ReplaceTaskRequest {
  return createReplaceTaskRequest(
    taskId,
    values.title.trim(),
    values.description === '' ? null : values.description,
    values.isCompleted,
  );
}
