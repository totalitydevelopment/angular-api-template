import { Routes } from '@angular/router';

import { customerGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./core/auth/login.component').then((m) => m.LoginComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'tasks' },
  {
    path: 'tasks',
    canMatch: [customerGuard],
    loadChildren: () =>
      import('./features/tasks/tasks.routes').then((routesModule) => routesModule.TASKS_ROUTES),
  },
];
