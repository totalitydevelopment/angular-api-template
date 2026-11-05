import { Routes } from '@angular/router';

import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';

import { TaskCreateComponent } from './components/task-create/task-create.component';
import { TaskDetailComponent } from './components/task-detail/task-detail.component';
import { TaskListComponent } from './components/task-list/task-list.component';
import { TasksApiService } from './services/tasks-api.service';
import { TasksEffects } from './store/tasks.effects';
import { TasksFacade } from './store/tasks.facade';
import { tasksFeature } from './store/tasks.reducer';

export const TASKS_ROUTES: Routes = [
  {
    path: '',
    providers: [provideState(tasksFeature), provideEffects(TasksEffects), TasksFacade, TasksApiService],
    children: [
      { path: '', pathMatch: 'full', component: TaskListComponent },
      { path: 'create', component: TaskCreateComponent },
      { path: ':taskId', component: TaskDetailComponent },
    ],
  },
];
