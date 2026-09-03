import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [FormsModule, RouterLink],
    templateUrl: './register.html',
    styleUrl: './register.css'
})
export class Register {
    firstName = '';
    lastName = '';
    email = '';
    matriculationNumber = '';
    password = '';
    confirmPassword = '';
    errorMessage = signal('');

    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    onSubmit() {
        this.errorMessage.set('');

        if (this.password !== this.confirmPassword) {
            this.errorMessage.set('Passwords do not match');
            return;
        }

        this.authService.register({
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            matriculationNumber: this.matriculationNumber,
            password: this.password
        }).subscribe({
            next: () => this.router.navigate(['/dashboard']),
            error: (err) => this.errorMessage.set(err?.error?.message || 'Registration failed')
        });
    }
}
