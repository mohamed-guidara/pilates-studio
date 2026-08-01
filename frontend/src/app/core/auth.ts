import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api'; // adjust to your backend

  constructor(private http: HttpClient) {}

  // Login request
  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials);
  }

  // Save token + role in localStorage
  saveToken(token: string, role: string) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_role', role);
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  // Get user role
  getUserRole(): string | null {
    return localStorage.getItem('user_role');
  }

  // Logout
  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
  }
}
