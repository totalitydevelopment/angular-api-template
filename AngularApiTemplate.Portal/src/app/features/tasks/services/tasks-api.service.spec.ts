import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../core/config/api-base-url';
import {
  CreateTaskRequest,
  CreateTaskResponse,
  createDeleteTaskRequest,
  createGetTaskRequest,
  createReplaceTaskRequest,
  createTaskRequest,
  GetTaskResponse,
  ListTaskResponse,
  ReplaceTaskRequest,
  ReplaceTaskResponse,
} from '../models/task-contracts';
import { TasksApiService } from './tasks-api.service';

const listTask: ListTaskResponse = {
  id: 'task-id',
  title: 'Test',
  description: null,
  isCompleted: false,
};
const createdTask: CreateTaskResponse = {
  id: 'task-id',
  title: 'Test',
  description: null,
  isCompleted: false,
};
const detailTask: GetTaskResponse = {
  id: 'task-id',
  title: 'Test',
  description: null,
  isCompleted: false,
};
const replacedTask: ReplaceTaskResponse = {
  id: 'task-id',
  title: 'Updated',
  description: 'Notes',
  isCompleted: true,
};

describe('TasksApiService', () => {
  let api: TasksApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        TasksApiService,
      ],
    });
    api = TestBed.inject(TasksApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lists the unpaginated array without artificial query parameters', () => {
    api.list().subscribe((response) => expect(response).toEqual([listTask]));
    const call = http.expectOne('/api/tasks');
    expect(call.request.method).toBe('GET');
    expect(call.request.body).toBeNull();
    expect(call.request.params.keys()).toEqual([]);
    call.flush([listTask]);
  });
  it('posts only the create request and returns the actual resource shape', () => {
    const request: CreateTaskRequest = createTaskRequest('Test', null);
    api.create(request).subscribe((response) => expect(response).toEqual(createdTask));
    const call = http.expectOne('/api/tasks');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(request);
    call.flush(createdTask, { status: 201, statusText: 'Created' });
  });
  it('encodes the ID in the GET route without inventing query parameters or a body', () => {
    api
      .get(createGetTaskRequest('id/with space'))
      .subscribe((response) => expect(response).toEqual(detailTask));
    const call = http.expectOne('/api/tasks/id%2Fwith%20space');
    expect(call.request.method).toBe('GET');
    expect(call.request.body).toBeNull();
    expect(call.request.params.keys()).toEqual([]);
    call.flush(detailTask);
  });
  it('puts the complete replacement body to the encoded route and returns the updated task', () => {
    const request: ReplaceTaskRequest = createReplaceTaskRequest(
      'id/with space',
      'Updated',
      'Notes',
      true,
    );
    api.replace(request).subscribe((response) => expect(response).toEqual(replacedTask));
    const call = http.expectOne('/api/tasks/id%2Fwith%20space');
    expect(call.request.method).toBe('PUT');
    expect(call.request.body).toEqual({
      title: 'Updated',
      description: 'Notes',
      isCompleted: true,
    });
    call.flush(replacedTask);
  });
  it('handles a 204 DELETE without a request body or response envelope', () => {
    const complete = vi.fn();
    api.delete(createDeleteTaskRequest(detailTask.id)).subscribe({ complete });
    const call = http.expectOne('/api/tasks/task-id');
    expect(call.request.method).toBe('DELETE');
    expect(call.request.body).toBeNull();
    call.flush(null, { status: 204, statusText: 'No Content' });
    expect(complete).toHaveBeenCalledOnce();
  });
});
