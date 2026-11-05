import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TasksFacade } from '../../store/tasks.facade';
import { createTaskForm, toCreateTaskRequest } from './task-create.form';

@Component({
  selector: 'app-task-create',
  imports: [AsyncPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './task-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCreateComponent implements OnInit {
  private readonly facade = inject(TasksFacade);

  readonly vm$ = this.facade.createViewModel$;
  readonly form = createTaskForm();

  ngOnInit(): void {
    this.facade.openCreate();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.facade.create(toCreateTaskRequest(this.form.getRawValue()));
  }
}
