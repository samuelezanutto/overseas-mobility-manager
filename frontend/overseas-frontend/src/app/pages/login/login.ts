import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email = '';
  password = '';
  errorMessage = signal('');

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  onSubmit() {
    this.authService.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      // err.error.message carries the backend's actual reason (e.g. "Invalid
      // credentials"); a request that never reached the backend (server
      // still starting up, network down) has no such message and must not
      // be reported as a wrong password
      error: (err) =>
        this.errorMessage.set(err?.error?.message || 'Unable to reach the server, please try again'),
    });
  }
}
