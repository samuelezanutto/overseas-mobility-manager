import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    { path: 'login', component: Login },
    { 
        path: 'dashboard', 
        component: Dashboard,
        canActivate: [authGuard]
    },
    { 
        path: 'applications/new', 
        canActivate: [authGuard],
        loadComponent: () => import('./pages/application-new/application-new').then(m => m.ApplicationNew) 
    },
    { 
        path: 'applications/:id', 
        canActivate: [authGuard],
        loadComponent: () => import('./pages/application-detail/application-detail').then(m => m.ApplicationDetail) 
    },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: '**', redirectTo: '/login' }
];