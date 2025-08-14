import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/sync', pathMatch: 'full' },
  {
    path: 'sync',
    loadComponent: () => import('./components/sync/sync.component').then(c => c.SyncComponent)
  }
];
