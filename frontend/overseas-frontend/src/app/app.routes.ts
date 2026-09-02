import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'dashboard', component: Dashboard },
    { path: 'applications/:id', loadComponent: () => 
        import('./pages/application-detail/application-detail').then(m => m.ApplicationDetail) },
    { path: '', redirectTo: '/login', pathMatch: 'full' }
];