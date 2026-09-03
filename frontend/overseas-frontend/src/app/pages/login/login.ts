import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './login.html',
    styleUrl: './login.css'
})
export class Login {
    email = '';
    password = '';
    errorMessage = signal('');

    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    onSubmit() {
        this.authService.login(this.email, this.password).subscribe({
            next: () => this.router.navigate(['/dashboard']),
            error: () => this.errorMessage.set('Incorrect email or password')
        });
    }
}