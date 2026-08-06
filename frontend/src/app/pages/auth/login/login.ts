import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  email: string = '';
  password: string = '';
  isLoading: boolean = false;

  constructor(private auth: AuthService, private router: Router

  ) {}

  login() {
    this.isLoading = true;

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.auth.saveToken(res.token, res.role, res.person);

        // Redirect based on role
        switch (res.role) {
          case 'admin':
            this.router.navigate(['/admin']);
            break;
          case 'coach':
            this.router.navigate(['/coach']);
            break;
          default:
            this.router.navigate(['/client']);
            break;
        }
      },
      error: (err) => {
        this.isLoading = false;
        alert('Login failed: ' + err.error.error);
        console.log(' isloadning: ' +this.isLoading)
      }
    });
  }

}
