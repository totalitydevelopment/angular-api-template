import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TasksFacade } from '../../store/tasks.facade';

const taskTitle: ValidatorFn = (control) => {
  const value: unknown = control.value;
  return typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 200
    ? null
    : { taskTitle: true };
};

@Component({
  selector: 'app-task-create',
  imports: [AsyncPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './task-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCreateComponent implements OnInit {
  private readonly facade = inject(TasksFacade);
  readonly vm$ = this.facade.createViewModel$;
  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [taskTitle] }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(2000)],
    }),
  });

  ngOnInit(): void {
    this.facade.openCreate();
  }

  get titleInvalid(): boolean {
    const control = this.form.controls.title;
    return control.touched && control.invalid;
  }

  get descriptionInvalid(): boolean {
    const control = this.form.controls.description;
    return control.touched && control.invalid;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const values = this.form.getRawValue();
    this.facade.create({
      title: values.title.trim(),
      description: values.description === '' ? null : values.description,
    });
  }
}
