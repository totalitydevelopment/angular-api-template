import { ChangeDetectionStrategy, Component, input, OnChanges, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { ReplaceTaskRequest } from '../../models/task-contracts';
import { TaskDetailItemViewModel, UpdateViewModel } from '../../models/tasks-view-models';
import { createTaskEditForm, resetTaskEditForm, toReplaceTaskRequest } from './task-edit.form';

@Component({
  selector: 'app-task-edit-form',
  imports: [ReactiveFormsModule],
  templateUrl: './task-edit-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskEditFormComponent implements OnChanges {
  readonly task = input.required<TaskDetailItemViewModel>();
  readonly update = input.required<UpdateViewModel>();

  readonly saved = output<ReplaceTaskRequest>();
  readonly cancelled = output<void>();

  readonly form = createTaskEditForm();

  ngOnChanges(): void {
    resetTaskEditForm(this.form, this.task());
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saved.emit(toReplaceTaskRequest(this.task().id, this.form.getRawValue()));
  }
}
