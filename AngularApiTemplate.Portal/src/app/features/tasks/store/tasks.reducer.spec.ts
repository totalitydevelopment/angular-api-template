import { ApiError, createApiError } from '../models/api-error';
import {
  CreateTaskResponse,
  createDeleteTaskRequest,
  createGetTaskRequest,
  createReplaceTaskRequest,
  createTaskRequest,
  GetTaskResponse,
  ListTaskResponse,
  ReplaceTaskResponse,
} from '../models/task-contracts';
import { TasksActions } from './tasks.actions';
import { initialTasksState, tasksFeature } from './tasks.reducer';
import {
  selectCreateViewModel,
  selectDetailViewModel,
  selectListViewModel,
} from './tasks.selectors';

const error: ApiError = createApiError(500, 'Failed');
const listTask: ListTaskResponse = {
  id: 'one',
  title: 'Test',
  description: null,
  isCompleted: false,
};
const createdTask: CreateTaskResponse = {
  id: 'one',
  title: 'Test',
  description: null,
  isCompleted: false,
};
const detailTask: GetTaskResponse = {
  id: 'one',
  title: 'Test',
  description: null,
  isCompleted: false,
};

describe('Tasks reducer and selectors', () => {
  const reduce = tasksFeature.reducer;
  it('derives list empty/loading/rows and invalidates snapshots on mutations', () => {
    let state = reduce(initialTasksState, TasksActions.listEntered());
    state = reduce(state, TasksActions.listRequested());
    expect(selectListViewModel({ tasks: state })).toMatchObject({ loading: true, empty: false });
    state = reduce(state, TasksActions.listFailed({ generation: 0, error }));
    expect(selectListViewModel({ tasks: state })).toMatchObject({ loading: false, error });
    state = reduce(state, TasksActions.listSucceeded({ generation: 0, response: [] }));
    expect(selectListViewModel({ tasks: state }).empty).toBe(true);
    state = reduce(state, TasksActions.listSucceeded({ generation: 0, response: [listTask] }));
    state = reduce(
      state,
      TasksActions.deleteRequested({ request: createDeleteTaskRequest('one'), origin: 'list' }),
    );
    const vm = selectListViewModel({ tasks: state });
    expect(vm.rows[0]).toMatchObject({
      completionLabel: 'Not completed',
      deletion: { pending: true },
    });
    state = reduce(
      state,
      TasksActions.deleteSucceeded({
        generation: 0,
        request: createDeleteTaskRequest('one'),
        origin: 'list',
      }),
    );
    expect(state.list).toEqual([]);
    expect(state.listStatus).toBe('idle');
    state = reduce(state, TasksActions.createSucceeded({ generation: 0, response: createdTask }));
    expect(state.listStatus).toBe('idle');
    state = reduce(state, TasksActions.listClosed());
    expect(state.listActive).toBe(false);
  });
  it('memoizes list and detail view models across unrelated state slice updates', () => {
    const initial = reduce(
      initialTasksState,
      TasksActions.listSucceeded({ generation: 0, response: [listTask] }),
    );
    const firstListVm = selectListViewModel({ tasks: initial });
    const afterCreatePending = reduce(
      initial,
      TasksActions.createRequested({ request: createTaskRequest('Another') }),
    );
    expect(selectListViewModel({ tasks: afterCreatePending })).toBe(firstListVm);

    const withDetail = reduce(
      afterCreatePending,
      TasksActions.detailSucceeded({
        generation: 0,
        request: createGetTaskRequest(detailTask.id),
        response: detailTask,
      }),
    );
    const detailRequestState = reduce(
      afterCreatePending,
      TasksActions.detailRequested({ request: createGetTaskRequest(detailTask.id) }),
    );
    const detailSuccessState = reduce(
      detailRequestState,
      TasksActions.detailSucceeded({
        generation: 0,
        request: createGetTaskRequest(detailTask.id),
        response: detailTask,
      }),
    );
    const firstDetailVm = selectDetailViewModel({ tasks: detailSuccessState });
    const afterCreateFailed = reduce(
      detailSuccessState,
      TasksActions.createFailed({ generation: 0, error }),
    );
    expect(selectDetailViewModel({ tasks: afterCreateFailed })).toBe(firstDetailVm);
    expect(selectListViewModel({ tasks: withDetail })).toBe(firstListVm);
  });
  it('clears stale detail and ignores responses for the previous route', () => {
    let state = reduce(
      initialTasksState,
      TasksActions.detailRequested({ request: createGetTaskRequest('one') }),
    );
    state = reduce(
      state,
      TasksActions.detailSucceeded({
        generation: 0,
        request: createGetTaskRequest('one'),
        response: detailTask,
      }),
    );
    state = reduce(state, TasksActions.detailRequested({ request: createGetTaskRequest('two') }));
    expect(state.detail).toBeNull();
    expect(state.detailStatus).toBe('pending');
    expect(
      reduce(
        state,
        TasksActions.detailSucceeded({
          generation: 0,
          request: createGetTaskRequest('one'),
          response: detailTask,
        }),
      ),
    ).toBe(state);
    state = reduce(
      state,
      TasksActions.detailFailed({ generation: 0, request: createGetTaskRequest('two'), error }),
    );
    expect(selectDetailViewModel({ tasks: state })).toMatchObject({ loading: false, error });
  });
  it('tracks deletion independently by ID and clears pending on failure', () => {
    let state = reduce(
      { ...initialTasksState, listActive: true, list: [listTask] },
      TasksActions.deleteRequested({ request: createDeleteTaskRequest('one'), origin: 'list' }),
    );
    state = reduce(
      state,
      TasksActions.deleteRequested({ request: createDeleteTaskRequest('two'), origin: 'list' }),
    );
    state = reduce(
      state,
      TasksActions.deleteFailed({ generation: 0, request: createDeleteTaskRequest('one'), error }),
    );
    expect(state.deletions['one']).toEqual({ status: 'failure', error });
    expect(state.deletions['two']?.status).toBe('pending');
    state = reduce(
      state,
      TasksActions.deleteSucceeded({
        generation: 0,
        request: createDeleteTaskRequest('two'),
        origin: 'list',
      }),
    );
    expect(state.deletions['two']).toBeUndefined();
  });
  it('does not retain settled deletion history across repeated tasks and departed views', () => {
    let state = initialTasksState;
    for (let index = 0; index < 100; index++) {
      const request = createDeleteTaskRequest(String(index));
      state = reduce(state, TasksActions.deleteRequested({ request, origin: 'list' }));
      state = reduce(
        state,
        TasksActions.deleteSucceeded({ generation: 0, request, origin: 'list' }),
      );
    }
    expect(state.deletions).toEqual({});
    const deleteRequest = createDeleteTaskRequest(detailTask.id);
    const detailRequest = createGetTaskRequest(detailTask.id);
    state = reduce(state, TasksActions.listEntered());
    state = reduce(state, TasksActions.listSucceeded({ generation: 0, response: [listTask] }));
    state = reduce(state, TasksActions.deleteRequested({ request: deleteRequest, origin: 'list' }));
    state = reduce(state, TasksActions.listClosed());
    expect(state.deletions[detailTask.id]?.status).toBe('pending');
    state = reduce(
      state,
      TasksActions.deleteFailed({ generation: 0, request: deleteRequest, error }),
    );
    expect(state.deletions).toEqual({});
    state = reduce(state, TasksActions.detailRequested({ request: detailRequest }));
    state = reduce(
      state,
      TasksActions.deleteRequested({ request: deleteRequest, origin: 'detail' }),
    );
    state = reduce(
      state,
      TasksActions.deleteFailed({ generation: 0, request: deleteRequest, error }),
    );
    expect(state.deletions[detailTask.id]?.error).toEqual(error);
    state = reduce(state, TasksActions.detailClosed());
    expect(state.deletions).toEqual({});
  });

  it('clears create errors on retry and resets completed forms on entry', () => {
    let state = reduce(
      initialTasksState,
      TasksActions.createRequested({ request: createTaskRequest('Test') }),
    );
    expect(selectCreateViewModel.projector(state.createStatus, state.createError).pending).toBe(
      true,
    );
    state = reduce(state, TasksActions.createFailed({ generation: 0, error }));
    expect(selectCreateViewModel.projector(state.createStatus, state.createError)).toEqual({
      pending: false,
      error,
    });
    state = reduce(state, TasksActions.createRequested({ request: createTaskRequest('Test') }));
    expect(state.createError).toBeNull();
    expect(reduce(state, TasksActions.createEntered())).toBe(state);
    state = reduce(state, TasksActions.createSucceeded({ generation: 0, response: createdTask }));
    state = reduce(state, TasksActions.createEntered());
    expect(state.createStatus).toBe('idle');
    expect(state.createError).toBeNull();
  });
  it('manages detail edit mode, updates task in place on success, and keeps form open on failure', () => {
    const detailRequest = createGetTaskRequest(detailTask.id);
    const updateRequest = createReplaceTaskRequest(detailTask.id, 'Updated', 'New notes', true);
    const updatedResponse: ReplaceTaskResponse = {
      id: detailTask.id,
      title: 'Updated',
      description: 'New notes',
      isCompleted: true,
    };
    let state = reduce(initialTasksState, TasksActions.detailRequested({ request: detailRequest }));
    state = reduce(
      state,
      TasksActions.detailSucceeded({ generation: 0, request: detailRequest, response: detailTask }),
    );
    state = reduce(state, TasksActions.editStarted());
    expect(selectDetailViewModel({ tasks: state }).update).toEqual({
      editing: true,
      pending: false,
      error: null,
    });
    state = reduce(state, TasksActions.updateRequested({ request: updateRequest }));
    expect(selectDetailViewModel({ tasks: state }).update.pending).toBe(true);
    state = reduce(
      state,
      TasksActions.updateFailed({ generation: 0, request: updateRequest, error }),
    );
    expect(selectDetailViewModel({ tasks: state }).update).toEqual({
      editing: true,
      pending: false,
      error,
    });
    state = reduce(
      state,
      TasksActions.updateSucceeded({
        generation: 0,
        request: updateRequest,
        response: updatedResponse,
      }),
    );
    expect(selectDetailViewModel({ tasks: state })).toMatchObject({
      task: {
        id: detailTask.id,
        title: 'Updated',
        description: 'New notes',
        rawDescription: 'New notes',
        isCompleted: true,
        completionLabel: 'Completed',
      },
      update: {
        editing: false,
        pending: false,
        error: null,
      },
    });
    expect(state.listStatus).toBe('idle');
  });
  it('derives not-found and removes detail after a successful deletion', () => {
    const detailRequest = createGetTaskRequest(detailTask.id);
    const deleteRequest = createDeleteTaskRequest(detailTask.id);
    let state = reduce(initialTasksState, TasksActions.detailRequested({ request: detailRequest }));
    state = reduce(
      state,
      TasksActions.detailSucceeded({ generation: 0, request: detailRequest, response: detailTask }),
    );
    expect(selectDetailViewModel({ tasks: state }).task).toEqual({
      id: detailTask.id,
      title: detailTask.title,
      description: 'No description.',
      rawDescription: null,
      isCompleted: false,
      completionLabel: 'Not completed',
    });
    state = reduce(
      state,
      TasksActions.deleteSucceeded({ generation: 0, request: deleteRequest, origin: 'detail' }),
    );
    expect(selectDetailViewModel({ tasks: state })).toMatchObject({
      task: null,
      notFound: true,
      loading: false,
    });
  });
});
