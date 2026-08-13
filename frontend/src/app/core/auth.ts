import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Person } from '../shared/models/person.model';

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

    register(data: { firstName: string; lastName: string; birthDate: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  // Save token + role in localStorage
  saveToken(token: string, role: string, person?: Person) {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);

    if (person) {
      localStorage.setItem('firstName', person.firstName);
      localStorage.setItem('personId', person.personId.toString());
    }
}

getFirstName(): string | null {
  return  localStorage.getItem('firstName');
}

getId(): string | null {
  return localStorage.getItem('personId')
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
