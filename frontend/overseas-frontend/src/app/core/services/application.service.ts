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
}