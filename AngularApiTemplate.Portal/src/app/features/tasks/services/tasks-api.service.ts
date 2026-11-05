import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api-base-url';
import {
  CreateTaskRequest,
  CreateTaskResponse,
  DeleteTaskRequest,
  GetTaskRequest,
  GetTaskResponse,
  ListTasksResponse,
  ReplaceTaskRequest,
  ReplaceTaskResponse,
} from '../models/task-contracts';

@Injectable()
export class TasksApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL).replace(/\/$/, '')}/tasks`;

  list(): Observable<ListTasksResponse> {
    return this.http.get<ListTasksResponse>(this.url);
  }

  create(request: CreateTaskRequest): Observable<CreateTaskResponse> {
    return this.http.post<CreateTaskResponse>(this.url, request);
  }

  get(request: GetTaskRequest): Observable<GetTaskResponse> {
    return this.http.get<GetTaskResponse>(`${this.url}/${encodeURIComponent(request.taskId)}`);
  }

  replace(request: ReplaceTaskRequest): Observable<ReplaceTaskResponse> {
    return this.http.put<ReplaceTaskResponse>(`${this.url}/${encodeURIComponent(request.taskId)}`, {
      title: request.title,
      description: request.description,
      isCompleted: request.isCompleted,
    });
  }

  delete(request: DeleteTaskRequest): Observable<void> {
    return this.http.delete<void>(`${this.url}/${encodeURIComponent(request.taskId)}`);
  }
}
