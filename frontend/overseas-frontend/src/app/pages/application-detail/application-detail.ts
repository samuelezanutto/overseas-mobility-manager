import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApplicationService } from '../../core/services/application.service';
import { periodLabel, statusLabel } from '../../core/utils/labels';

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './application-detail.html',
  styleUrl: './application-detail.css',
})
export class ApplicationDetail implements OnInit {
  application = signal<any>(null);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  userRole = signal<string | null>(null);
  applicationId = '';

  newMapping = {
    foreignCode: '',
    foreignName: '',
    foreignCredits: 0,
    cfCode: '',
    cfName: '',
    cfCredits: 0,
  };

  arrivalDate = '';
  departureDate = '';

  selectedLAFile: File | null = null;
  selectedTranscriptFile: File | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private applicationService: ApplicationService,
  ) {}

  ngOnInit() {
    this.userRole.set(this.authService.getRole());
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.applicationId = id;
      this.loadApplication(id);
    }
  }

  loadApplication(id: string) {
    this.applicationService.getApplication(id).subscribe({
      next: (app) => {
        this.application.set(app);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message ?? 'Error loading the application');
        this.loading.set(false);
      },
    });
  }

  activeMappings() {
    const app = this.application();
    return app ? app.mappings.filter((m: any) => m.isActive) : [];
  }

  canAddExam() {
    return this.isStudent() && this.application()?.status === 'created';
  }

  canUploadLA() {
    if (!this.isStudent()) return false;
    const status = this.application()?.status;
    if (status !== 'created' && status !== 'awaiting_la_approval') return false;
    const agreements = this.application()?.learningAgreements ?? [];
    if (agreements.length === 0) return true;
    return agreements[agreements.length - 1].status === 'rejected';
  }

  canSetDates() {
    return this.isStudent() && this.application()?.status === 'pre_departure_completed';
  }

  canProposeModification() {
    return this.isStudent() && this.application()?.status === 'mobility_in_progress';
  }

  canUploadTranscript() {
    return this.isStudent() && this.application()?.status === 'mobility_in_progress';
  }

  canCompletePreDeparture() {
    return this.isStaff() && this.application()?.status === 'awaiting_la_approval';
  }

  canClose() {
    return this.isStaff() && this.application()?.status === 'waiting_score_approval';
  }

  isTerminal() {
    const status = this.application()?.status;
    return status === 'closed' || status === 'canceled';
  }

  hasPendingCancellation() {
    return (this.application()?.cancellationRequests ?? []).some((r: any) => r.status === 'pending');
  }

  canRequestCancellation() {
    return this.isStudent() && !this.isTerminal() && !this.hasPendingCancellation();
  }

  canForceCancel() {
    return this.isStaff() && !this.isTerminal();
  }

  isStudent() {
    return this.userRole() === 'student';
  }
  isLecturer() {
    return this.userRole() === 'lecturer';
  }
  isStaff() {
    return this.userRole() === 'staff';
  }

  statusLabel = statusLabel;
  periodLabel = periodLabel;

  addMapping() {
    if (!this.newMapping.foreignCode || !this.newMapping.cfCode) {
      this.errorMessage.set('Please fill in at least the course codes');
      return;
    }

    this.applicationService.addMappings(this.applicationId, [this.newMapping]).subscribe({
      next: (app) => {
        this.application.set(app);
        this.successMessage.set('Exam added');
        this.errorMessage.set('');
        this.newMapping = {
          foreignCode: '',
          foreignName: '',
          foreignCredits: 0,
          cfCode: '',
          cfName: '',
          cfCredits: 0,
        };
      },
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Error adding the exam'),
    });
  }

  onLAFileSelected(event: any) {
    this.selectedLAFile = event.target.files[0] ?? null;
  }

  uploadLA() {
    if (!this.selectedLAFile) {
      this.errorMessage.set('Select a file');
      return;
    }

    this.applicationService
      .uploadLearningAgreement(this.applicationId, this.selectedLAFile)
      .subscribe({
        next: (app) => {
          this.application.set(app);
          this.successMessage.set('Learning Agreement uploaded');
          this.errorMessage.set('');
          this.selectedLAFile = null;
        },
        error: (err) => this.errorMessage.set(err.error?.message ?? 'Error uploading the file'),
      });
  }

  saveDates() {
    if (!this.arrivalDate || !this.departureDate) {
      this.errorMessage.set('Enter both dates');
      return;
    }
    if (new Date(this.departureDate) <= new Date(this.arrivalDate)) {
      this.errorMessage.set('Departure date must be after the arrival date');
      return;
    }

    this.applicationService
      .setDates(this.applicationId, this.arrivalDate, this.departureDate)
      .subscribe({
        next: (app) => {
          this.application.set(app);
          this.successMessage.set('Dates saved');
          this.errorMessage.set('');
        },
        error: (err) => this.errorMessage.set(err.error?.message ?? 'Error saving the dates'),
      });
  }

  onTranscriptFileSelected(event: any) {
    this.selectedTranscriptFile = event.target.files[0] ?? null;
  }

  uploadTranscript() {
    if (!this.selectedTranscriptFile) {
      this.errorMessage.set('Select a file');
      return;
    }

    this.applicationService
      .uploadTranscript(this.applicationId, this.selectedTranscriptFile)
      .subscribe({
        next: (app) => {
          this.application.set(app);
          this.successMessage.set('Transcript uploaded');
          this.errorMessage.set('');
          this.selectedTranscriptFile = null;
        },
        error: (err) =>
          this.errorMessage.set(err.error?.message ?? 'Error uploading the transcript'),
      });
  }

  evaluateLA(agreementId: string, decision: string) {
    const reason = decision === 'rejected' ? (prompt('Reason for rejection:') ?? '') : '';

    this.applicationService
      .evaluateLearningAgreement(this.applicationId, agreementId, decision, reason)
      .subscribe({
        next: (app) => {
          this.application.set(app);
          this.successMessage.set(`Learning Agreement ${decision}`);
          this.errorMessage.set('');
        },
        error: (err) => this.errorMessage.set(err.error?.message ?? 'Error evaluating'),
      });
  }

  evaluateMod(modificationId: string, decision: string) {
    const reason = decision === 'rejected' ? (prompt('Reason for rejection:') ?? '') : '';

    this.applicationService
      .evaluateModification(this.applicationId, modificationId, decision, reason)
      .subscribe({
        next: (app) => {
          this.application.set(app);
          this.successMessage.set(`Modification ${decision}`);
          this.errorMessage.set('');
        },
        error: (err) =>
          this.errorMessage.set(err.error?.message ?? 'Error evaluating the modification'),
      });
  }

  setResult(mappingId: string) {
    const score = prompt('Grade obtained (e.g. 28, 30L):');
    if (!score) return;

    const examDate = prompt('Exam date (YYYY-MM-DD):');
    if (!examDate) return;

    this.applicationService
      .setExamResult(this.applicationId, mappingId, score, examDate)
      .subscribe({
        next: (app) => {
          this.application.set(app);
          this.successMessage.set('Grade recorded');
          this.errorMessage.set('');
        },
        error: (err) => this.errorMessage.set(err.error?.message ?? 'Error recording the grade'),
      });
  }

  completePreDeparture() {
    this.applicationService.setPreDeparture(this.applicationId).subscribe({
      next: (app) => {
        this.application.set(app);
        this.successMessage.set('Pre-departure phase completed');
        this.errorMessage.set('');
      },
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Error'),
    });
  }

  closeApp() {
    this.applicationService.closeApplication(this.applicationId).subscribe({
      next: (app) => {
        this.application.set(app);
        this.successMessage.set('Application closed');
        this.errorMessage.set('');
      },
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Error'),
    });
  }

  requestCancellation() {
    const reason = prompt('Why do you want to cancel this application?');
    if (!reason) return;

    this.applicationService.requestCancellation(this.applicationId, reason).subscribe({
      next: (app) => {
        this.application.set(app);
        this.successMessage.set('Cancellation requested');
        this.errorMessage.set('');
      },
      error: (err) =>
        this.errorMessage.set(err.error?.message ?? 'Error requesting the cancellation'),
    });
  }

  evaluateCancellation(requestId: string, decision: string) {
    const decisionReason =
      decision === 'rejected' ? (prompt('Reason for rejecting the cancellation:') ?? '') : '';

    this.applicationService
      .evaluateCancellationRequest(this.applicationId, requestId, decision, decisionReason)
      .subscribe({
        next: (app) => {
          this.application.set(app);
          this.successMessage.set(`Cancellation request ${decision}`);
          this.errorMessage.set('');
        },
        error: (err) =>
          this.errorMessage.set(err.error?.message ?? 'Error evaluating the cancellation'),
      });
  }

  forceCancel() {
    const reason = prompt('Reason for canceling this application:');
    if (!reason) return;

    this.applicationService.cancelApplication(this.applicationId, reason).subscribe({
      next: (app) => {
        this.application.set(app);
        this.successMessage.set('Application canceled');
        this.errorMessage.set('');
      },
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Error canceling the application'),
    });
  }

  downloadFile(filePath: string) {
    this.applicationService.downloadFile(this.applicationId, filePath).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: () => this.errorMessage.set('Error downloading the file'),
    });
  }

  fileName(filePath: string) {
    return filePath.split('/').pop();
  }

  modDescription = '';
  modAction: 'add' | 'replace' | 'delete' = 'add';
  modMapping = {
    foreignCode: '',
    foreignName: '',
    foreignCredits: 0,
    cfCode: '',
    cfName: '',
    cfCredits: 0,
  };
  modReplacesMappingId = '';
  selectedModFile: File | null = null;

  onModFileSelected(event: any) {
    this.selectedModFile = event.target.files[0] ?? null;
  }

  proposeModification() {
    if (!this.modDescription) {
      this.errorMessage.set('Enter a description of the change');
      return;
    }
    if (!this.selectedModFile) {
      this.errorMessage.set('Upload the new Learning Agreement');
      return;
    }
    if (this.modAction !== 'add' && !this.modReplacesMappingId) {
      this.errorMessage.set('Select which exam this change applies to');
      return;
    }
    if (this.modAction !== 'delete' && (!this.modMapping.foreignCode || !this.modMapping.cfCode)) {
      this.errorMessage.set('Fill in the new exam data');
      return;
    }

    const proposedMappings = this.modAction === 'delete' ? [] : [this.modMapping];
    const replacesMappingId = this.modAction === 'add' ? undefined : this.modReplacesMappingId;

    this.applicationService
      .proposeModification(
        this.applicationId,
        this.modDescription,
        proposedMappings,
        this.selectedModFile,
        replacesMappingId,
      )
      .subscribe({
        next: (app) => {
          this.application.set(app);
          this.successMessage.set('Modification proposed successfully');
          this.errorMessage.set('');
          this.modDescription = '';
          this.modAction = 'add';
          this.modMapping = {
            foreignCode: '',
            foreignName: '',
            foreignCredits: 0,
            cfCode: '',
            cfName: '',
            cfCredits: 0,
          };
          this.modReplacesMappingId = '';
          this.selectedModFile = null;
        },
        error: (err) =>
          this.errorMessage.set(err.error?.message ?? 'Error proposing the modification'),
      });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
