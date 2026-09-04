import { KeyValuePipe } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApplicationService } from '../../core/services/application.service';
import { periodLabel, statusLabel } from '../../core/utils/labels';

const ALL_STATUSES = [
  'created',
  'awaiting_la_approval',
  'pre_departure_completed',
  'mobility_in_progress',
  'waiting_score_approval',
  'closed',
  'canceled',
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, KeyValuePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  user = signal<any>(null);
  applications = signal<any[]>([]);
  loading = signal(true);
  errorMessage = signal('');

  statusFilter = signal('');
  countryFilter = signal('');
  institutionFilter = signal('');

  statusLabel = statusLabel;
  periodLabel = periodLabel;

  isStaff = computed(() => this.user()?.role === 'staff');

  // counters for status cards - always include every status, even at zero,
  // so the shape of the pipeline is visible at a glance
  statusCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const status of ALL_STATUSES) {
      counts[status] = 0;
    }
    for (const app of this.applications()) {
      counts[app.status] = (counts[app.status] ?? 0) + 1;
    }
    return counts;
  });

  countries = computed(() => {
    const set = new Set<string>();
    for (const app of this.applications()) {
      if (app.institutionId?.country) {
        set.add(app.institutionId.country);
      }
    }
    return Array.from(set).sort();
  });

  institutions = computed(() => {
    const set = new Set<string>();
    for (const app of this.applications()) {
      if (app.institutionId?.name) {
        set.add(app.institutionId.name);
      }
    }
    return Array.from(set).sort();
  });

  filteredApplications = computed(() => {
    const status = this.statusFilter();
    const country = this.countryFilter();
    const institution = this.institutionFilter();

    return this.applications().filter((app) => {
      if (status && app.status !== status) return false;
      if (country && app.institutionId?.country !== country) return false;
      if (institution && app.institutionId?.name !== institution) return false;
      return true;
    });
  });

  constructor(
    private authService: AuthService,
    private applicationService: ApplicationService,
    private router: Router,
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
        this.errorMessage.set('Error loading applications');
        this.loading.set(false);
      },
    });
  }

  // keeps the pipeline order (created -> ... -> canceled) instead of the
  // keyvalue pipe's default alphabetical sort
  keepOrder = () => 0;

  filterByStatus(status: string) {
    this.statusFilter.set(this.statusFilter() === status ? '' : status);
  }

  clearFilters() {
    this.statusFilter.set('');
    this.countryFilter.set('');
    this.institutionFilter.set('');
  }

  goToNew() {
    this.router.navigate(['/applications/new']);
  }

  goToDetail(id: string) {
    this.router.navigate(['/applications', id]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
