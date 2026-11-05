import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { DeleteViewModel } from '../../models/tasks-view-models';

@Component({
  selector: 'app-task-delete-confirmation',
  templateUrl: './task-delete-confirmation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskDeleteConfirmationComponent {
  readonly taskTitle = input.required<string>();
  readonly deletion = input.required<DeleteViewModel>();
  readonly confirming = input.required<boolean>();

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
