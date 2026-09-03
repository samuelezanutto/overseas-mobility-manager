import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApplicationService } from '../../core/services/application.service';
import { InstitutionService } from '../../core/services/institution.service';

@Component({
  selector: 'app-application-new',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './application-new.html',
  styleUrl: './application-new.css',
})
export class ApplicationNew implements OnInit {
  institutions = signal<any[]>([]);
  lecturers = signal<any[]>([]);
  errorMessage = signal('');

  institutionId = '';
  lecturerId = '';
  academicYear = '2025/2026';
  mobilityPeriod = 'first_semester';

  constructor(
    private applicationService: ApplicationService,
    private institutionService: InstitutionService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.institutionService.getInstitutions().subscribe({
      next: (list) => this.institutions.set(list),
    });
    this.institutionService.getLecturers().subscribe({
      next: (list) => this.lecturers.set(list),
    });
  }

  onSubmit() {
    if (!this.institutionId || !this.lecturerId || !this.academicYear) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    this.applicationService
      .createApplication({
        institutionId: this.institutionId,
        lecturerId: this.lecturerId,
        academicYear: this.academicYear,
        mobilityPeriod: this.mobilityPeriod,
      })
      .subscribe({
        next: (app) => this.router.navigate(['/applications', app._id]),
        error: () => this.errorMessage.set('Error creating the application'),
      });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
