import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Coach {
  coachId: number;
  personId: number;
  isAdmin: number;
}

@Injectable({
  providedIn: 'root'
})
export class CoachService {
  private apiUrl = 'http://localhost:8000/api/coaches';

  constructor(private http: HttpClient) {}

  getCoaches(): Observable<Coach[]> {
    return this.http.get<Coach[]>(this.apiUrl);
  }

  getCoach(id: number): Observable<Coach> {
    return this.http.get<Coach>(`${this.apiUrl}/${id}`);
  }

  createCoach(coach: Partial<Coach>): Observable<Coach> {
    return this.http.post<Coach>(this.apiUrl, coach);
  }

  updateCoach(id: number, coach: Partial<Coach>): Observable<Coach> {
    return this.http.put<Coach>(`${this.apiUrl}/${id}`, coach);
  }

  deleteCoach(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
