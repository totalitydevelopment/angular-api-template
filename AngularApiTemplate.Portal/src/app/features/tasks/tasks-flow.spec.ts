import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { API_BASE_URL } from '../../core/config/api-base-url';

import { appConfig } from '../../app.config';

const task = {
  id: '5c7ed320-56ad-455d-8518-17ebd02eaf32',
  title: 'Typed form task',
  description: null,
  isCompleted: false,
};

describe('Tasks route and component flows', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, { provide: API_BASE_URL, useValue: '/api' }, provideHttpClientTesting()],
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
    expect(title.getAttribute('aria-invalid')).toBeNull();
    expect(title.getAttribute('aria-describedby')).toBe('title-help');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    harness.detectChanges();
    expect(title.getAttribute('aria-invalid')).toBe('true');
    expect(title.getAttribute('aria-describedby')).toBe('title-help title-error');
    title.value = '  Typed form task  ';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    harness.detectChanges();
    expect(title.getAttribute('aria-invalid')).toBeNull();
    expect(title.getAttribute('aria-describedby')).toBe('title-help');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const create = http.expectOne('/api/tasks');
    expect(create.request.body).toEqual({ title: 'Typed form task', description: null });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Creating…');
    expect(TestBed.inject(Router).url).toBe('/tasks/create');
    create.flush(task, { status: 201, statusText: 'Created' });
    await harness.fixture.whenStable();
    const detail = http.expectOne(`/api/tasks/${task.id}`);
    detail.flush(task);
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe(`/tasks/${task.id}`);
    expect(harness.routeNativeElement?.textContent).toContain('Typed form task');
  });

  it('confirms delete, shows failure, clears pending, and navigates only after successful retry', async () => {
    const harness = await RouterTestingHarness.create(`/tasks/${task.id}`);
    http.expectOne(`/api/tasks/${task.id}`).flush(task);
    harness.detectChanges();
    function click(label: string): void {
      const buttons = harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button');
      const button =
        buttons && Array.from(buttons).find((candidate) => candidate.textContent?.includes(label));
      if (!button) throw new Error(`Button not found: ${label}`);
      button.click();
      harness.detectChanges();
    }
    click('Delete task');
    http.expectNone((request) => request.method === 'DELETE');
    click('Cancel');
    http.expectNone((request) => request.method === 'DELETE');
    click('Delete task');
    click('Confirm delete');
    const failed = http.expectOne(`/api/tasks/${task.id}`);
    expect(failed.request.method).toBe('DELETE');
    failed.flush({ title: 'Failure' }, { status: 500, statusText: 'Server Error' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Delete failed');
    expect(TestBed.inject(Router).url).toBe(`/tasks/${task.id}`);
    const button = harness.routeNativeElement?.querySelector<HTMLButtonElement>('button.danger');
    expect(button?.disabled).toBe(false);
    click('Delete task');
    click('Confirm delete');
    http.expectOne(`/api/tasks/${task.id}`).flush(null, { status: 204, statusText: 'No Content' });
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
    http.expectOne('/api/tasks').flush([task]);
    harness.detectChanges();
    harness.detectChanges();
    http.expectNone('/api/tasks');
    expect(harness.routeNativeElement?.textContent).toContain(task.title);
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
