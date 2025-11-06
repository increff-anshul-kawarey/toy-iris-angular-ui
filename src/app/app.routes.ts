import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { AlgorithmParametersComponent } from './features/algorithm-parameters/algorithm-parameters.component';
import { UploadComponent } from './features/upload/upload.component';
import { NoosAnalyticsComponent } from './features/reports/noos-analytics.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'upload', component: UploadComponent },
  { path: 'algorithm-parameters', component: AlgorithmParametersComponent },
  { path: 'reports/noos-analytics', component: NoosAnalyticsComponent },
  // TODO: Add other report routes as components are created
  { path: '**', redirectTo: '/dashboard' }
];
