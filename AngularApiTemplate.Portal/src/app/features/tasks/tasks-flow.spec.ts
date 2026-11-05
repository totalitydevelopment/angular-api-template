import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { appConfig } from '../../app.config';
import { API_BASE_URL } from '../../core/config/api-base-url';
import {
  CreateTaskResponse,
  createTaskRequest,
  GetTaskResponse,
  ListTaskResponse,
} from './models/task-contracts';

const createdTask: CreateTaskResponse = {
  id: '5c7ed320-56ad-455d-8518-17ebd02eaf32',
  title: 'Typed form task',
  description: null,
  isCompleted: false,
};
const detailTask: GetTaskResponse = {
  id: '5c7ed320-56ad-455d-8518-17ebd02eaf32',
  title: 'Typed form task',
  description: null,
  isCompleted: false,
};
const listTask: ListTaskResponse = {
  id: '5c7ed320-56ad-455d-8518-17ebd02eaf32',
  title: 'Typed form task',
  description: null,
  isCompleted: false,
};

describe('Tasks route and component flows', () => {
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

  it('cancels page-owned reads on repeated departures and reused detail routes', async () => {
    const harness = await RouterTestingHarness.create('/tasks/create');
    for (let index = 0; index < 5; index++) {
      await harness.navigateByUrl('/tasks');
      const list = http.expectOne('/api/tasks');
      await harness.navigateByUrl('/tasks/create');
      expect(list.cancelled).toBe(true);
      await harness.navigateByUrl('/tasks/first');
      const first = http.expectOne('/api/tasks/first');
      await harness.navigateByUrl('/tasks/second');
      expect(first.cancelled).toBe(true);
      const second = http.expectOne('/api/tasks/second');
      await harness.navigateByUrl('/tasks/create');
      expect(second.cancelled).toBe(true);
      http.expectNone((request) => request.method === 'GET');
    }
  });

  it('creates through the typed form and navigates to detail only after server success', async () => {
    const harness = await RouterTestingHarness.create('/tasks/create');
    const title = harness.routeNativeElement?.querySelector<HTMLInputElement>('#task-title');
    const form = harness.routeNativeElement?.querySelector('form');
    if (!title || !form) throw new Error('Create form was not rendered');
    expect(harness.routeNativeElement?.querySelector('.error')).toBeNull();
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('.error')?.textContent).toContain(
      'Enter a title between 1 and 200 characters.',
    );
    title.value = '  Typed form task  ';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('.error')).toBeNull();
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const create = http.expectOne('/api/tasks');
    expect(create.request.body).toEqual(createTaskRequest('Typed form task', null));
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Creating…');
    expect(TestBed.inject(Router).url).toBe('/tasks/create');
    create.flush(createdTask, { status: 201, statusText: 'Created' });
    await harness.fixture.whenStable();
    const detail = http.expectOne(`/api/tasks/${detailTask.id}`);
    detail.flush(detailTask);
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe(`/tasks/${detailTask.id}`);
    expect(harness.routeNativeElement?.textContent).toContain('Typed form task');
  });

  it('confirms delete, shows failure, clears pending, and navigates only after successful retry', async () => {
    const harness = await RouterTestingHarness.create(`/tasks/${detailTask.id}`);
    http.expectOne(`/api/tasks/${detailTask.id}`).flush(detailTask);
    harness.detectChanges();
    function click(label: string): void {
      const buttons = harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button');
      const button =
        buttons && Array.from(buttons).find((candidate) => candidate.textContent?.includes(label));
      if (!button) throw new Error(`Button not found: ${label}`);
      button.click();
      harness.detectChanges();
    }
    click('Edit task');
    const editTitle =
      harness.routeNativeElement?.querySelector<HTMLInputElement>('#edit-task-title');
    const editCompleted =
      harness.routeNativeElement?.querySelector<HTMLInputElement>('#edit-task-completed');
    const editForm = harness.routeNativeElement?.querySelector('form');
    if (!editTitle || !editCompleted || !editForm) throw new Error('Edit form was not rendered');
    expect(editTitle.value).toBe(detailTask.title);
    editTitle.value = '  Updated task title  ';
    editTitle.dispatchEvent(new Event('input', { bubbles: true }));
    editCompleted.click();
    harness.detectChanges();
    editForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const updateCall = http.expectOne(`/api/tasks/${detailTask.id}`);
    expect(updateCall.request.method).toBe('PUT');
    expect(updateCall.request.body).toEqual({
      title: 'Updated task title',
      description: null,
      isCompleted: true,
    });
    updateCall.flush({
      ...detailTask,
      title: 'Updated task title',
      isCompleted: true,
    });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Updated task title');
    expect(harness.routeNativeElement?.textContent).toContain('Completed');

    click('Delete task');
    http.expectNone((request) => request.method === 'DELETE');
    click('Cancel');
    http.expectNone((request) => request.method === 'DELETE');
    click('Delete task');
    click('Confirm delete');
    const failed = http.expectOne(`/api/tasks/${detailTask.id}`);
    expect(failed.request.method).toBe('DELETE');
    failed.flush({ title: 'Failure' }, { status: 500, statusText: 'Server Error' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Delete failed');
    expect(TestBed.inject(Router).url).toBe(`/tasks/${detailTask.id}`);
    const button = harness.routeNativeElement?.querySelector<HTMLButtonElement>('button.danger');
    expect(button?.disabled).toBe(false);
    click('Delete task');
    click('Confirm delete');
    http
      .expectOne(`/api/tasks/${detailTask.id}`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await harness.fixture.whenStable();
    http.expectOne('/api/tasks').flush([]);
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/tasks');
    expect(harness.routeNativeElement?.textContent).toContain('No tasks yet');
  });

  it('loads once per entry, recovers list errors, and does not cache forever', async () => {
    const harness = await RouterTestingHarness.create('/tasks');
    http.expectOne('/api/tasks').flush({}, { status: 500, statusText: 'Server Error' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('server could not complete');
    const retry = Array.from(
      harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    ).find((button) => button.textContent?.includes('Try again'));
    retry?.click();
    http.expectOne('/api/tasks').flush([listTask]);
    harness.detectChanges();
    harness.detectChanges();
    http.expectNone('/api/tasks');
    expect(harness.routeNativeElement?.textContent).toContain(listTask.title);
    expect(harness.routeNativeElement?.querySelector('ul.task-list')?.getAttribute('role')).toBe(
      'list',
    );
    await harness.navigateByUrl('/tasks/create');
    await harness.navigateByUrl('/tasks');
    http.expectOne('/api/tasks').flush([]);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('No tasks yet');
  });
});
