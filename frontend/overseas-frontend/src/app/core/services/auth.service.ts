import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http
      .post<{ token: string; user: any }>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((response) => {
          // save the token when login succeeds
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
        }),
      );
  }

  register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    matriculationNumber: string;
  }) {
    // public registration is student-only; the backend forces role: 'student'
    return this.http.post<{ token: string; user: any }>(`${this.apiUrl}/auth/register`, data).pipe(
      tap((response) => {
        // log the student in right away
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }),
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getRole(): string | null {
    const user = this.getUser();
    return user ? user.role : null;
  }
}
