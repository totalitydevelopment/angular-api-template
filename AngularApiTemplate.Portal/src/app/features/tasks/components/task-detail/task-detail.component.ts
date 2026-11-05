import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { distinctUntilChanged, map } from 'rxjs';

import {
  createDeleteTaskRequest,
  createGetTaskRequest,
  ReplaceTaskRequest,
} from '../../models/task-contracts';
import { TasksFacade } from '../../store/tasks.facade';
import { TaskDeleteConfirmationComponent } from '../task-delete-confirmation/task-delete-confirmation.component';
import { TaskEditFormComponent } from '../task-edit-form/task-edit-form.component';

@Component({
  selector: 'app-task-detail',
  imports: [AsyncPipe, RouterLink, TaskDeleteConfirmationComponent, TaskEditFormComponent],
  templateUrl: './task-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskDetailComponent implements OnDestroy {
  private readonly facade = inject(TasksFacade);
  private readonly destroyRef = inject(DestroyRef);

  readonly confirmDelete = signal(false);
  readonly vm$ = this.facade.detailViewModel$;

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(
        map((params) => params.get('taskId') ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((taskId) => {
        this.confirmDelete.set(false);
        this.facade.openDetail(createGetTaskRequest(taskId));
      });
  }

  ngOnDestroy(): void {
    this.facade.closeDetail();
  }

  retry(): void {
    this.facade.retryDetail();
  }

  startEdit(): void {
    this.confirmDelete.set(false);
    this.facade.startEdit();
  }

  cancelEdit(): void {
    this.facade.cancelEdit();
  }

  saveEdit(request: ReplaceTaskRequest): void {
    this.facade.update(request);
  }

  requestDelete(): void {
    this.confirmDelete.set(true);
  }

  cancelDelete(): void {
    this.confirmDelete.set(false);
  }

  delete(taskId: string): void {
    this.facade.delete(createDeleteTaskRequest(taskId), 'detail');
    this.confirmDelete.set(false);
  }
}
