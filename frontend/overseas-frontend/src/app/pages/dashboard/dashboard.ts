import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApplicationService } from '../../core/services/application.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    templateUrl: './dashboard.html'
})
export class Dashboard implements OnInit {
    user: any = null;
    applications: any[] = [];
    loading = true;
    errorMessage = '';

    constructor(
        private authService: AuthService,
        private applicationService: ApplicationService,
        private router: Router
    ) {}

    ngOnInit() {
        this.user = this.authService.getUser();
        this.loadApplications();
    }

    loadApplications() {
      console.log('Chiamo GET /applications...');
      this.applicationService.getApplications().subscribe({
          next: (apps) => {
              console.log('Risposta ricevuta:', apps);
              this.applications = apps;
              this.loading = false;
          },
          error: (err) => {
              console.log('Errore:', err);
              this.errorMessage = 'Errore nel caricamento delle applicazioni';
              this.loading = false;
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