import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Action } from '@ngrx/store';
import { of, Subject, throwError } from 'rxjs';

import { CreateTaskResponse, GetTaskResponse, ListTasksResponse } from '../models/task-contracts';
import { TasksApiService } from '../services/tasks-api.service';
import { TasksActions } from './tasks.actions';
import { TasksEffects } from './tasks.effects';
import { initialTasksState } from './tasks.reducer';

const task = { id: 'one', title: 'Test', description: null, isCompleted: false };

describe('TasksEffects', () => {
  let actions: Subject<Action>;
  let effects: TasksEffects;
  const api = {
    list: vi.fn<TasksApiService['list']>(),
    create: vi.fn<TasksApiService['create']>(),
    get: vi.fn<TasksApiService['get']>(),
    delete: vi.fn<TasksApiService['delete']>(),
  };
  const router = { url: '/tasks/create', navigate: vi.fn().mockResolvedValue(true) };
  beforeEach(() => {
    vi.clearAllMocks();
    actions = new Subject<Action>();
    router.url = '/tasks/create';
    TestBed.configureTestingModule({
      providers: [
        TasksEffects,
        provideMockStore({ initialState: { tasks: initialTasksState } }),
        provideMockActions(() => actions),
        { provide: TasksApiService, useValue: api },
        { provide: Router, useValue: router },
      ],
    });
    effects = TestBed.inject(TasksEffects);
  });
  afterEach(() => actions.complete());

  it('switches list reads, survives errors, and cancels snapshots invalidated by mutations', () => {
    const old = new Subject<ListTasksResponse>();
    const current = new Subject<ListTasksResponse>();
    api.list
      .mockReturnValueOnce(old)
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })))
      .mockReturnValueOnce(current)
      .mockReturnValueOnce(of([task]));
    const outputs: Action[] = [];
    const sub = effects.list$.subscribe((action) => outputs.push(action));
    actions.next(TasksActions.listRequested());
    actions.next(TasksActions.listRequested());
    expect(old.observed).toBe(false);
    expect(outputs[0]?.type).toBe(TasksActions.listFailed.type);
    actions.next(TasksActions.listRequested());
    actions.next(TasksActions.deleteSucceeded({ request: { taskId: 'one' }, origin: 'list' }));
    expect(current.observed).toBe(false);
    actions.next(TasksActions.listRequested());
    expect(outputs[1]).toEqual(TasksActions.listSucceeded({ response: [task] }));
    sub.unsubscribe();
  });

  it('keeps create effects alive after failure and never retries the failed request', () => {
    api.create
      .mockReturnValueOnce(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { title: 'Invalid', detail: null, errors: { Title: ['Required'] } },
            }),
        ),
      )
      .mockReturnValueOnce(of(task));
    const outputs: Action[] = [];
    const sub = effects.create$.subscribe((action) => outputs.push(action));
    actions.next(TasksActions.createRequested({ request: { title: '' } }));
    actions.next(TasksActions.createRequested({ request: { title: 'Test' } }));
    expect(outputs[0]).toMatchObject({
      type: TasksActions.createFailed.type,
      error: {
        status: 400,
        message: 'Invalid',
        validationErrors: [{ field: 'Title', messages: ['Required'] }],
      },
    });
    expect(outputs[1]).toEqual(TasksActions.createSucceeded({ response: task }));
    expect(api.create).toHaveBeenCalledTimes(2);
    expect(() => JSON.stringify(outputs)).not.toThrow();
    sub.unsubscribe();
  });
  it('exhausts duplicate create requests while pending', () => {
    const pending = new Subject<CreateTaskResponse>();
    api.create.mockReturnValue(pending);
    const sub = effects.create$.subscribe();
    actions.next(TasksActions.createRequested({ request: { title: 'Test' } }));
    actions.next(TasksActions.createRequested({ request: { title: 'Duplicate' } }));
    expect(api.create).toHaveBeenCalledOnce();
    pending.next(task);
    pending.complete();
    actions.next(TasksActions.createRequested({ request: { title: 'Next' } }));
    expect(api.create).toHaveBeenCalledTimes(2);
    sub.unsubscribe();
  });
  it('cancels old detail reads and suppresses stale responses', () => {
    const first = new Subject<GetTaskResponse>();
    const second = new Subject<GetTaskResponse>();
    api.get.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const outputs: Action[] = [];
    const sub = effects.detail$.subscribe((action) => outputs.push(action));
    actions.next(TasksActions.detailRequested({ request: { taskId: 'one' } }));
    actions.next(TasksActions.detailRequested({ request: { taskId: 'two' } }));
    expect(first.observed).toBe(false);
    first.next(task);
    second.next({ ...task, id: 'two' });
    expect(outputs).toEqual([
      TasksActions.detailSucceeded({
        request: { taskId: 'two' },
        response: { ...task, id: 'two' },
      }),
    ]);
    actions.next(TasksActions.detailClosed());
    expect(second.observed).toBe(false);
    sub.unsubscribe();
  });
  it('allows concurrent deletes for different IDs, gates duplicates, and recovers after failure', () => {
    const first = new Subject<void>();
    const second = new Subject<void>();
    api.delete
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
      .mockReturnValueOnce(of(undefined));
    const outputs: Action[] = [];
    const sub = effects.delete$.subscribe((action) => {
      outputs.push(action);
      actions.next(action);
    });
    actions.next(TasksActions.deleteRequested({ request: { taskId: 'one' }, origin: 'list' }));
    actions.next(TasksActions.deleteRequested({ request: { taskId: 'one' }, origin: 'list' }));
    actions.next(TasksActions.deleteRequested({ request: { taskId: 'two' }, origin: 'list' }));
    expect(api.delete).toHaveBeenCalledTimes(2);
    first.error(new HttpErrorResponse({ status: 500 }));
    second.next();
    second.complete();
    actions.next(TasksActions.deleteRequested({ request: { taskId: 'one' }, origin: 'list' }));
    expect(outputs.map((action) => action.type)).toEqual([
      TasksActions.deleteFailed.type,
      TasksActions.deleteSucceeded.type,
      TasksActions.deleteSucceeded.type,
    ]);
    expect(api.delete).toHaveBeenCalledTimes(3);
    sub.unsubscribe();
  });
  it('navigates only on success while the initiating page is still current', () => {
    const sub = effects.afterCreate$.subscribe();
    actions.next(
      TasksActions.createFailed({
        error: { status: 500, message: 'Failed', validationErrors: [] },
      }),
    );
    expect(router.navigate).not.toHaveBeenCalled();
    router.url = '/tasks/create#main-content';
    actions.next(TasksActions.createSucceeded({ response: task }));
    expect(router.navigate).toHaveBeenCalledWith(['/tasks', 'one']);
    router.navigate.mockClear();
    router.url = '/elsewhere';
    actions.next(TasksActions.createSucceeded({ response: task }));
    expect(router.navigate).not.toHaveBeenCalled();
    sub.unsubscribe();
    router.url = '/tasks/one#confirm';
    const deletes = effects.afterDelete$.subscribe();
    actions.next(
      TasksActions.deleteFailed({
        request: { taskId: 'one' },
        error: { status: 500, message: 'Failed', validationErrors: [] },
      }),
    );
    expect(router.navigate).not.toHaveBeenCalled();
    actions.next(TasksActions.deleteSucceeded({ request: { taskId: 'one' }, origin: 'detail' }));
    expect(router.navigate).toHaveBeenCalledWith(['/tasks']);
    deletes.unsubscribe();
  });
});
