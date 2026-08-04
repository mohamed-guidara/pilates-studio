import { Component } from '@angular/core';
import { AuthService } from '../../../core/auth';

@Component({
  selector: 'app-welcome-page',
  imports: [],
  templateUrl: './welcome-page.html',
  styleUrl: './welcome-page.css',
})
export class WelcomePage {
  firstName:  string | null = null;
    constructor(private auth: AuthService) {
      this.firstName = this.auth.getFirstName();
    console.log(`firstname: ${this.firstName}`)
  }
}
