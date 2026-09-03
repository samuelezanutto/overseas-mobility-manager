import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApplicationService } from '../../core/services/application.service';

@Component({
    selector: 'app-application-detail',
    standalone: true,
    imports: [],
    templateUrl: './application-detail.html'
})
export class ApplicationDetail implements OnInit {
    application = signal<any>(null);
    loading = signal(true);
    errorMessage = signal('');
    userRole = signal<string | null>(null);

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private authService: AuthService,
        private applicationService: ApplicationService
    ) {}

    ngOnInit() {
        this.userRole.set(this.authService.getRole());
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadApplication(id);
        }
    }

    loadApplication(id: string) {
        this.applicationService.getApplication(id).subscribe({
            next: (app) => {
                this.application.set(app);
                this.loading.set(false);
            },
            error: () => {
                this.errorMessage.set('Errore nel caricamento della domanda');
                this.loading.set(false);
            }
        });
    }

    activeMappings() {
        const app = this.application();
        return app ? app.mappings.filter((m: any) => m.isActive) : [];
    }

    goBack() {
        this.router.navigate(['/dashboard']);
    }
}