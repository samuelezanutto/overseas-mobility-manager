import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApplicationService } from '../../core/services/application.service';

@Component({
    selector: 'app-application-detail',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './application-detail.html'
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
      cfCredits: 0
  };

  arrivalDate = '';
  departureDate = '';

  selectedLAFile: File | null = null;
  selectedTranscriptFile: File | null = null;

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

  isStudent() { return this.userRole() === 'student'; }
  isLecturer() { return this.userRole() === 'lecturer'; }
  isStaff() { return this.userRole() === 'staff'; }

  addMapping() {
      if (!this.newMapping.foreignCode || !this.newMapping.cfCode) {
          this.errorMessage.set('Compila almeno i codici dei corsi');
          return;
      }

      this.applicationService.addMappings(this.applicationId, [this.newMapping]).subscribe({
          next: (app) => {
              this.application.set(app);
              this.successMessage.set('Esame aggiunto');
              this.errorMessage.set('');
              this.newMapping = {
                  foreignCode: '', foreignName: '', foreignCredits: 0,
                  cfCode: '', cfName: '', cfCredits: 0
              };
          },
          error: () => this.errorMessage.set('Errore nell\'aggiunta dell\'esame')
      });
  }

  onLAFileSelected(event: any) {
      this.selectedLAFile = event.target.files[0] ?? null;
  }

  uploadLA() {
      if (!this.selectedLAFile) {
          this.errorMessage.set('Seleziona un file');
          return;
      }

      this.applicationService.uploadLearningAgreement(this.applicationId, this.selectedLAFile).subscribe({
          next: (app) => {
              this.application.set(app);
              this.successMessage.set('Learning Agreement caricato');
              this.errorMessage.set('');
              this.selectedLAFile = null;
          },
          error: () => this.errorMessage.set('Errore nel caricamento del file')
      });
  }

  saveDates() {
      if (!this.arrivalDate || !this.departureDate) {
          this.errorMessage.set('Inserisci entrambe le date');
          return;
      }

      this.applicationService.setDates(this.applicationId, this.arrivalDate, this.departureDate).subscribe({
          next: (app) => {
              this.application.set(app);
              this.successMessage.set('Date salvate');
              this.errorMessage.set('');
          },
          error: () => this.errorMessage.set('Errore nel salvataggio delle date')
      });
  }

  onTranscriptFileSelected(event: any) {
      this.selectedTranscriptFile = event.target.files[0] ?? null;
  }

  uploadTranscript() {
      if (!this.selectedTranscriptFile) {
          this.errorMessage.set('Seleziona un file');
          return;
      }

      this.applicationService.uploadTranscript(this.applicationId, this.selectedTranscriptFile).subscribe({
          next: (app) => {
              this.application.set(app);
              this.successMessage.set('Transcript caricato');
              this.errorMessage.set('');
              this.selectedTranscriptFile = null;
          },
          error: () => this.errorMessage.set('Errore nel caricamento del transcript')
      });
  }

  evaluateLA(agreementId: string, decision: string) {
      const reason = decision === 'rejected'
          ? prompt('Motivo del rifiuto:') ?? ''
          : '';

      this.applicationService.evaluateLearningAgreement(this.applicationId, agreementId, decision, reason).subscribe({
          next: (app) => {
              this.application.set(app);
              this.successMessage.set(`Learning Agreement ${decision}`);
              this.errorMessage.set('');
          },
          error: () => this.errorMessage.set('Errore nella valutazione')
      });
  }

  evaluateMod(modificationId: string, decision: string) {
      const reason = decision === 'rejected'
          ? prompt('Motivo del rifiuto:') ?? ''
          : '';

      this.applicationService.evaluateModification(this.applicationId, modificationId, decision, reason).subscribe({
          next: (app) => {
              this.application.set(app);
              this.successMessage.set(`Modifica ${decision}`);
              this.errorMessage.set('');
          },
          error: () => this.errorMessage.set('Errore nella valutazione della modifica')
      });
  }

  setResult(mappingId: string) {
      const score = prompt('Voto ottenuto (es. 28, 30L):');
      if (!score) return;

      const examDate = prompt('Data esame (YYYY-MM-DD):');
      if (!examDate) return;

      this.applicationService.setExamResult(this.applicationId, mappingId, score, examDate).subscribe({
          next: (app) => {
              this.application.set(app);
              this.successMessage.set('Voto registrato');
              this.errorMessage.set('');
          },
          error: () => this.errorMessage.set('Errore nella registrazione del voto')
      });
  }

  completePreDeparture() {
      this.applicationService.setPreDeparture(this.applicationId).subscribe({
          next: (app) => {
              this.application.set(app);
              this.successMessage.set('Fase pre-partenza completata');
              this.errorMessage.set('');
          },
          error: (err) => this.errorMessage.set(err.error?.message ?? 'Errore')
      });
  }

  closeApp() {
      this.applicationService.closeApplication(this.applicationId).subscribe({
          next: (app) => {
              this.application.set(app);
              this.successMessage.set('Domanda chiusa');
              this.errorMessage.set('');
          },
          error: (err) => this.errorMessage.set(err.error?.message ?? 'Errore')
      });
  }

  downloadFile(filePath: string) {
    this.applicationService.downloadFile(this.applicationId, filePath).subscribe({
        next: (blob) => {
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
        },
        error: () => this.errorMessage.set('Errore nel download del file')
    });
  }

  fileName(filePath: string) {
      return filePath.split('/').pop();
  }

  goBack() {
      this.router.navigate(['/dashboard']);
  }
}