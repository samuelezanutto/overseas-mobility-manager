import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class ApplicationService {
    private apiUrl = 'http://localhost:3000';

    constructor(private http: HttpClient) {}

    getApplications() {
        return this.http.get<any[]>(`${this.apiUrl}/applications`);
    }

    getApplication(id: string) {
        return this.http.get<any>(`${this.apiUrl}/applications/${id}`);
    }

    createApplication(data: any) {
        return this.http.post<any>(`${this.apiUrl}/applications`, data);
    }

    addMappings(id: string, mappings: any[]) {
        return this.http.post<any>(`${this.apiUrl}/applications/${id}/mappings`, { mappings });
    }

    uploadLearningAgreement(id: string, file: File) {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<any>(`${this.apiUrl}/applications/${id}/learning-agreement`, formData);
    }

    evaluateLearningAgreement(id: string, agreementId: string, decision: string, reason?: string) {
        return this.http.patch<any>(
            `${this.apiUrl}/applications/${id}/learning-agreement/${agreementId}/evaluate`,
            { decision, reason }
        );
    }

    setPreDeparture(id: string) {
        return this.http.patch<any>(`${this.apiUrl}/applications/${id}/pre-departure`, {});
    }

    setDates(id: string, arrivalDate: string, departureDate: string) {
        return this.http.patch<any>(`${this.apiUrl}/applications/${id}/dates`, { arrivalDate, departureDate });
    }

    proposeModification(id: string, description: string, proposedMappings: any[], file: File) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('description', description);
        formData.append('proposedMappings', JSON.stringify(proposedMappings));
        return this.http.post<any>(`${this.apiUrl}/applications/${id}/modifications`, formData);
    }

    evaluateModification(id: string, modificationId: string, decision: string, reason?: string) {
        return this.http.patch<any>(
            `${this.apiUrl}/applications/${id}/modifications/${modificationId}/evaluate`,
            { decision, reason }
        );
    }

    uploadTranscript(id: string, file: File) {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<any>(`${this.apiUrl}/applications/${id}/transcript`, formData);
    }

    setExamResult(id: string, mappingId: string, score: string, examDate: string) {
        return this.http.patch<any>(
            `${this.apiUrl}/applications/${id}/mappings/${mappingId}/result`,
            { score, examDate }
        );
    }

    closeApplication(id: string) {
        return this.http.patch<any>(`${this.apiUrl}/applications/${id}/close`, {});
    }

    downloadFile(applicationId: string, filePath: string) {
    // estrae solo il nome file dal path completo "uploads/123-file.pdf"
        const filename = filePath.split('/').pop();
        return this.http.get(
            `${this.apiUrl}/applications/${applicationId}/files/${filename}`,
            { responseType: 'blob' }
        );
    }
}