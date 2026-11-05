import { Component, signal } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import { appConfig } from '../../app.config';
import { API_BASE_URL } from '../config/api-base-url';
import { createApiError } from '../../features/tasks/models/api-error';
import {
  createDeleteTaskRequest,
  createGetTaskRequest,
  createReplaceTaskRequest,
  createTaskRequest,
} from '../../features/tasks/models/task-contracts';
import { toApiError } from '../../features/tasks/services/task-api-error';
import { TasksActions } from '../../features/tasks/store/tasks.actions';
import { initialTasksState, tasksFeature } from '../../features/tasks/store/tasks.reducer';
import { authConfig, validateAuthConfig } from './auth.config';
import { customerGuard } from './auth.guard';
import { customerTokenInterceptor, isApiRequest } from './auth.interceptor';
import { AuthService } from './auth.service';
import { sessionChanged } from './session.state';

@Component({ template: 'Public page' })
class PublicPage {}

const task = { id: 'one', title: 'Private', description: null, isCompleted: false };

describe('Customer route boundary', () => {
  const loadChildren = vi.fn(async () => [{ path: '', component: PublicPage }]);
  const auth = {
    config: { enabled: true },
    authenticated: signal(false),
    initialize: vi.fn(async () => {}),
    refreshAccount: vi.fn(),
  };
  beforeEach(() => {
    loadChildren.mockClear();
    auth.authenticated.set(false);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        provideRouter([
          { path: 'login', component: PublicPage },
          { path: 'tasks', canMatch: [customerGuard], loadChildren },
        ]),
      ],
    });
  });
  it('redirects an anonymous customer before loading the protected feature', async () => {
    await RouterTestingHarness.create('/tasks');
    expect(loadChildren).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Ftasks');
  });
  it('loads the feature for an authenticated customer', async () => {
    auth.authenticated.set(true);
    await RouterTestingHarness.create('/tasks');
    expect(loadChildren).toHaveBeenCalledOnce();
  });
  it('keeps the disabled template usable without initializing Entra', async () => {
    auth.config.enabled = false;
    auth.initialize.mockClear();
    await RouterTestingHarness.create('/tasks');
    expect(loadChildren).toHaveBeenCalledOnce();
    expect(auth.initialize).not.toHaveBeenCalled();
    auth.config.enabled = true;
  });
});

describe('Customer token interceptor', () => {
  const auth = {
    config: { enabled: true },
    accessToken: vi.fn(async () => 'test-access-token'),
    initialize: vi.fn(async () => {}),
  };
  let http: HttpTestingController;
  beforeEach(() => {
    auth.config.enabled = true;
    auth.accessToken.mockReset().mockResolvedValue('test-access-token');
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        { provide: AuthService, useValue: auth },
        { provide: API_BASE_URL, useValue: 'https://api.example.test/api' },
        provideHttpClient(withInterceptors([customerTokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('attaches the API access token only to the configured origin and path boundary', async () => {
    const client = TestBed.inject(HttpClient);
    const response = firstValueFrom(client.get('https://api.example.test/api/tasks'));
    await vi.waitFor(() => expect(auth.accessToken).toHaveBeenCalledOnce());
    const request = http.expectOne('https://api.example.test/api/tasks');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-access-token');
    request.flush([]);
    await response;
    for (const url of [
      'https://api.example.test/apievil',
      'https://api.example.test.evil/api/tasks',
      'https://other.example.test/api/tasks',
    ]) {
      const response = firstValueFrom(client.get(url));
      const request = http.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush([]);
      await response;
    }
    expect(auth.accessToken).toHaveBeenCalledOnce();
    expect(isApiRequest('/api/tasks', '/api')).toBe(true);
    expect(isApiRequest('/api-other', '/api')).toBe(false);
  });
  it('does not acquire tokens in disabled mode', async () => {
    auth.config.enabled = false;
    const response = firstValueFrom(
      TestBed.inject(HttpClient).get('https://api.example.test/api/tasks'),
    );
    const request = http.expectOne('https://api.example.test/api/tasks');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);
    await response;
    expect(auth.accessToken).not.toHaveBeenCalled();
  });
  it('maps token acquisition failures to serializable 401 API errors', async () => {
    auth.accessToken.mockRejectedValue(new Error('Private provider detail'));
    const response = firstValueFrom(
      TestBed.inject(HttpClient).get('https://api.example.test/api/tasks'),
    );
    await expect(response).rejects.toMatchObject({ status: 401 });
    http.expectNone('https://api.example.test/api/tasks');
  });
});

describe('Root session generation and lazy Tasks requests', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        { provide: API_BASE_URL, useValue: '/api' },
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('resets Tasks, cancels every active operation and rejects stale successes and failures', async () => {
    const harness = await RouterTestingHarness.create('/tasks/create');
    const store = TestBed.inject(Store);
    store.dispatch(TasksActions.listRequested());
    store.dispatch(TasksActions.detailRequested({ request: createGetTaskRequest('one') }));
    store.dispatch(TasksActions.createRequested({ request: createTaskRequest('Create', null) }));
    store.dispatch(
      TasksActions.updateRequested({
        request: createReplaceTaskRequest('one', 'Update', null, true),
      }),
    );
    store.dispatch(
      TasksActions.deleteRequested({ request: createDeleteTaskRequest('two'), origin: 'list' }),
    );
    const pending = http.match(() => true);
    expect(pending).toHaveLength(5);
    store.dispatch(sessionChanged({ generation: 1 }));
    expect(pending.every((request) => request.cancelled)).toBe(true);
    expect(store.selectSignal(tasksFeature.selectTasksState)()).toEqual(initialTasksState);
    const request = createGetTaskRequest('one');
    store.dispatch(TasksActions.listSucceeded({ generation: 0, response: [task] }));
    store.dispatch(
      TasksActions.detailFailed({
        generation: 0,
        request,
        error: createApiError(403, 'Old session'),
      }),
    );
    store.dispatch(TasksActions.createSucceeded({ generation: 0, response: task }));
    await harness.fixture.whenStable();
    expect(store.selectSignal(tasksFeature.selectTasksState)()).toEqual(initialTasksState);
    expect(TestBed.inject(Router).url).toBe('/tasks/create');
    http.expectNone(() => true);
    // A cancelled per-ID delete group must not prevent the next session using that ID.
    store.dispatch(
      TasksActions.deleteRequested({ request: createDeleteTaskRequest('two'), origin: 'list' }),
    );
    http.expectOne('/api/tasks/two').flush(null, { status: 204, statusText: 'No content' });
    expect(store.selectSignal(tasksFeature.selectDeletions)()).toEqual({});
  });
  it('uses the current root generation when a feature is loaded after a session change', async () => {
    const store = TestBed.inject(Store);
    store.dispatch(sessionChanged({ generation: 3 }));
    await RouterTestingHarness.create('/tasks');
    http.expectOne('/api/tasks').flush([task]);
    expect(store.selectSignal(tasksFeature.selectList)()).toEqual([task]);
    store.dispatch(sessionChanged({ generation: 2 }));
    expect(store.selectSignal(tasksFeature.selectList)()).toEqual([task]);
  });
});

describe('Auth configuration and API error boundaries', () => {
  it('allows disabled placeholders and rejects enabled placeholders', () => {
    expect(() => validateAuthConfig(authConfig)).not.toThrow();
    expect(() => validateAuthConfig({ ...authConfig, enabled: true })).toThrow();
  });
  for (const status of [401, 403]) {
    it('keeps HTTP ' + status + ' errors plain and serializable', () => {
      const error = toApiError(
        new HttpErrorResponse({ status, error: new Error('Private detail') }),
      );
      expect(error).not.toBeInstanceOf(HttpErrorResponse);
      expect(JSON.parse(JSON.stringify(error))).toEqual(error);
      expect(JSON.stringify(error)).not.toContain('Private detail');
      expect(error.status).toBe(status);
    });
  }
});
