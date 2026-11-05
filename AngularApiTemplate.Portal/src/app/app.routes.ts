import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tasks' },
  {
    path: 'tasks',
    loadChildren: () =>
      import('./features/tasks/tasks.routes').then((routesModule) => routesModule.TASKS_ROUTES),
  },
];
