import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  fname = '';
  lname = '';
  birthdate = '';
  email = '';
  password = '';
  confirmPassword = '';

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  register() {
    if (this.password !== this.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    console.log(this.fname);
    console.log(this.lname);
    console.log(this.password);
    console.log(this.confirmPassword);
    console.log(this.email);
    this.auth
      .register({
        firstName: this.fname,
        lastName: this.lname,
        birthDate: this.birthdate,
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: (res) => {
          this.auth.saveToken(res.token, res.role);
          this.router.navigate(['/client']); // always client after register
        },
        error: (err) => {
          alert('Registration failed: ' + err.error.message);
          console.log(err.error.message)
        },
      });
  }
}
