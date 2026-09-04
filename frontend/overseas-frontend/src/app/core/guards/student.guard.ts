import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// only students can create mobility applications; a lecturer or staff
// account navigating here directly is bounced back to the dashboard
export const studentGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getRole() === 'student') {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
