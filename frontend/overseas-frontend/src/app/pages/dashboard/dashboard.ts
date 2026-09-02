import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApplicationService } from '../../core/services/application.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [],
    templateUrl: './dashboard.html'
})
export class Dashboard implements OnInit {
    user = signal<any>(null);
    applications = signal<any[]>([]);
    loading = signal(true);
    errorMessage = signal('');

    constructor(
        private authService: AuthService,
        private applicationService: ApplicationService,
        private router: Router
    ) {}

    ngOnInit() {
        this.user.set(this.authService.getUser());
        this.loadApplications();
    }

    loadApplications() {
        this.applicationService.getApplications().subscribe({
            next: (apps) => {
                this.applications.set(apps);
                this.loading.set(false);
            },
            error: () => {
                this.errorMessage.set('Errore nel caricamento delle applicazioni');
                this.loading.set(false);
            }
        });
    }

    goToDetail(id: string) {
        this.router.navigate(['/applications', id]);
    }

    logout() {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}