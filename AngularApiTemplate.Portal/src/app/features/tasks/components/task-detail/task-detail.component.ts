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

import { TasksFacade } from '../../store/tasks.facade';

@Component({
  selector: 'app-task-detail',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './task-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskDetailComponent implements OnDestroy {
  private readonly facade = inject(TasksFacade);
  private readonly destroyRef = inject(DestroyRef);
  readonly taskId = signal('');
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
        this.taskId.set(taskId);
        this.confirmDelete.set(false);
        this.facade.openDetail({ taskId });
      });
  }

  retry(): void {
    this.facade.openDetail({ taskId: this.taskId() });
  }
  delete(): void {
    this.facade.delete({ taskId: this.taskId() }, 'detail');
    this.confirmDelete.set(false);
  }
  ngOnDestroy(): void {
    this.facade.closeDetail();
  }
}
