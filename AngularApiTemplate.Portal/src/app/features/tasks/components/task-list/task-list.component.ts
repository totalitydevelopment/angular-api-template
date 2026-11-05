import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { createDeleteTaskRequest } from '../../models/task-contracts';
import { TasksFacade } from '../../store/tasks.facade';
import { TaskDeleteConfirmationComponent } from '../task-delete-confirmation/task-delete-confirmation.component';

@Component({
  selector: 'app-task-list',
  imports: [AsyncPipe, RouterLink, TaskDeleteConfirmationComponent],
  templateUrl: './task-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskListComponent implements OnInit, OnDestroy {
  private readonly facade = inject(TasksFacade);

  readonly vm$ = this.facade.listViewModel$;
  readonly confirmingId = signal<string | null>(null);

  ngOnInit(): void {
    this.facade.openList();
  }

  ngOnDestroy(): void {
    this.facade.closeList();
  }

  refresh(): void {
    this.facade.refreshList();
  }

  requestDelete(taskId: string): void {
    this.confirmingId.set(taskId);
  }

  cancelDelete(): void {
    this.confirmingId.set(null);
  }

  delete(taskId: string): void {
    this.facade.delete(createDeleteTaskRequest(taskId), 'list');
    this.confirmingId.set(null);
  }
}
