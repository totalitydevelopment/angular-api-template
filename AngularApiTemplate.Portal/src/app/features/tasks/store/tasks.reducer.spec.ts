import { initialTasksState, tasksFeature } from './tasks.reducer';
import { TasksActions } from './tasks.actions';
import {
  selectCreateViewModel,
  selectDetailViewModel,
  selectListViewModel,
} from './tasks.selectors';

const error = { status: 500, message: 'Failed', validationErrors: [] };
const task = { id: 'one', title: 'Test', description: null, isCompleted: false };

describe('Tasks reducer and selectors', () => {
  const reduce = tasksFeature.reducer;
  it('derives list empty/loading/rows and invalidates snapshots on mutations', () => {
    let state = reduce(initialTasksState, TasksActions.listEntered());
    state = reduce(state, TasksActions.listRequested());
    expect(selectListViewModel({ tasks: state })).toMatchObject({ loading: true, empty: false });
    state = reduce(state, TasksActions.listFailed({ error }));
    expect(selectListViewModel({ tasks: state })).toMatchObject({ loading: false, error });
    state = reduce(state, TasksActions.listSucceeded({ response: [] }));
    expect(selectListViewModel({ tasks: state }).empty).toBe(true);
    state = reduce(state, TasksActions.listSucceeded({ response: [task] }));
    state = reduce(
      state,
      TasksActions.deleteRequested({ request: { taskId: 'one' }, origin: 'list' }),
    );
    const vm = selectListViewModel({ tasks: state });
    expect(vm.rows[0]).toMatchObject({
      completionLabel: 'Not completed',
      deletion: { pending: true },
    });
    state = reduce(
      state,
      TasksActions.deleteSucceeded({ request: { taskId: 'one' }, origin: 'list' }),
    );
    expect(state.list).toEqual([]);
    expect(state.listStatus).toBe('idle');
    state = reduce(state, TasksActions.createSucceeded({ response: task }));
    expect(state.listStatus).toBe('idle');
    state = reduce(state, TasksActions.listClosed());
    expect(state.listActive).toBe(false);
  });
  it('memoizes list and detail view models across unrelated state slice updates', () => {
    const initial = reduce(initialTasksState, TasksActions.listSucceeded({ response: [task] }));
    const firstListVm = selectListViewModel({ tasks: initial });
    const afterCreatePending = reduce(
      initial,
      TasksActions.createRequested({ request: { title: 'Another' } }),
    );
    expect(selectListViewModel({ tasks: afterCreatePending })).toBe(firstListVm);

    const withDetail = reduce(
      afterCreatePending,
      TasksActions.detailSucceeded({ request: { taskId: task.id }, response: task }),
    );
    const detailRequestState = reduce(
      afterCreatePending,
      TasksActions.detailRequested({ request: { taskId: task.id } }),
    );
    const detailSuccessState = reduce(
      detailRequestState,
      TasksActions.detailSucceeded({ request: { taskId: task.id }, response: task }),
    );
    const firstDetailVm = selectDetailViewModel({ tasks: detailSuccessState });
    const afterCreateFailed = reduce(detailSuccessState, TasksActions.createFailed({ error }));
    expect(selectDetailViewModel({ tasks: afterCreateFailed })).toBe(firstDetailVm);
    expect(selectListViewModel({ tasks: withDetail })).toBe(firstListVm);
  });
  it('clears stale detail and ignores responses for the previous route', () => {
    let state = reduce(
      initialTasksState,
      TasksActions.detailRequested({ request: { taskId: 'one' } }),
    );
    state = reduce(
      state,
      TasksActions.detailSucceeded({ request: { taskId: 'one' }, response: task }),
    );
    state = reduce(state, TasksActions.detailRequested({ request: { taskId: 'two' } }));
    expect(state.detail).toBeNull();
    expect(state.detailStatus).toBe('pending');
    expect(
      reduce(state, TasksActions.detailSucceeded({ request: { taskId: 'one' }, response: task })),
    ).toBe(state);
    state = reduce(state, TasksActions.detailFailed({ request: { taskId: 'two' }, error }));
    expect(selectDetailViewModel({ tasks: state })).toMatchObject({ loading: false, error });
  });
  it('tracks deletion independently by ID and clears pending on failure', () => {
    let state = reduce(
      { ...initialTasksState, listActive: true, list: [task] },
      TasksActions.deleteRequested({ request: { taskId: 'one' }, origin: 'list' }),
    );
    state = reduce(
      state,
      TasksActions.deleteRequested({ request: { taskId: 'two' }, origin: 'list' }),
    );
    state = reduce(state, TasksActions.deleteFailed({ request: { taskId: 'one' }, error }));
    expect(state.deletions['one']).toEqual({ status: 'failure', error });
    expect(state.deletions['two']?.status).toBe('pending');
    state = reduce(
      state,
      TasksActions.deleteSucceeded({ request: { taskId: 'two' }, origin: 'list' }),
    );
    expect(state.deletions['two']).toBeUndefined();
  });
  it('does not retain settled deletion history across repeated tasks and departed views', () => {
    let state = initialTasksState;
    for (let index = 0; index < 100; index++) {
      const request = { taskId: String(index) };
      state = reduce(state, TasksActions.deleteRequested({ request, origin: 'list' }));
      state = reduce(state, TasksActions.deleteSucceeded({ request, origin: 'list' }));
    }
    expect(state.deletions).toEqual({});
    const request = { taskId: task.id };
    state = reduce(state, TasksActions.listEntered());
    state = reduce(state, TasksActions.listSucceeded({ response: [task] }));
    state = reduce(state, TasksActions.deleteRequested({ request, origin: 'list' }));
    state = reduce(state, TasksActions.listClosed());
    expect(state.deletions[task.id]?.status).toBe('pending');
    state = reduce(state, TasksActions.deleteFailed({ request, error }));
    expect(state.deletions).toEqual({});
    state = reduce(state, TasksActions.detailRequested({ request }));
    state = reduce(state, TasksActions.deleteRequested({ request, origin: 'detail' }));
    state = reduce(state, TasksActions.deleteFailed({ request, error }));
    expect(state.deletions[task.id]?.error).toEqual(error);
    state = reduce(state, TasksActions.detailClosed());
    expect(state.deletions).toEqual({});
  });

  it('clears create errors on retry and resets completed forms on entry', () => {
    let state = reduce(
      initialTasksState,
      TasksActions.createRequested({ request: { title: 'Test' } }),
    );
    expect(selectCreateViewModel.projector(state.createStatus, state.createError).pending).toBe(
      true,
    );
    state = reduce(state, TasksActions.createFailed({ error }));
    expect(selectCreateViewModel.projector(state.createStatus, state.createError)).toEqual({
      pending: false,
      error,
    });
    state = reduce(state, TasksActions.createRequested({ request: { title: 'Test' } }));
    expect(state.createError).toBeNull();
    expect(reduce(state, TasksActions.createEntered())).toBe(state);
    state = reduce(state, TasksActions.createSucceeded({ response: task }));
    state = reduce(state, TasksActions.createEntered());
    expect(state.created).toBeNull();
    expect(state.createStatus).toBe('idle');
  });
  it('derives not-found and removes detail after a successful deletion', () => {
    let state = reduce(
      initialTasksState,
      TasksActions.detailRequested({ request: { taskId: task.id } }),
    );
    state = reduce(
      state,
      TasksActions.detailSucceeded({ request: { taskId: task.id }, response: task }),
    );
    state = reduce(
      state,
      TasksActions.deleteSucceeded({ request: { taskId: task.id }, origin: 'detail' }),
    );
    expect(selectDetailViewModel({ tasks: state })).toMatchObject({
      task: null,
      notFound: true,
      loading: false,
    });
  });
});
