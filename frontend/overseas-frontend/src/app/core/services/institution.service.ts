import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class InstitutionService {
    private apiUrl = 'http://localhost:3000';

    constructor(private http: HttpClient) {}

    getInstitutions() {
        return this.http.get<any[]>(`${this.apiUrl}/institutions`);
    }

    getLecturers() {
        return this.http.get<any[]>(`${this.apiUrl}/users/lecturers`);
    }
}