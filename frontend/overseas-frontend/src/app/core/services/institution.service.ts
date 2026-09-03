import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InstitutionService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getInstitutions() {
    return this.http.get<any[]>(`${this.apiUrl}/institutions`);
  }

  getLecturers() {
    return this.http.get<any[]>(`${this.apiUrl}/users/lecturers`);
  }
}
