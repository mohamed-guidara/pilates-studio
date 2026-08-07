import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Coach } from '../shared/models/coach.model';

@Injectable({
  providedIn: 'root'
})
export class CoachService {
  private apiUrl = 'http://localhost:8000/api/coaches';

  constructor(private http: HttpClient) {}

  // READ all
  getCoaches(): Observable<Coach[]> {
    return this.http.get<Coach[]>(this.apiUrl);
  }

  // READ one
  getCoach(id: number): Observable<Coach> {
    return this.http.get<Coach>(`${this.apiUrl}/${id}`);
  }

  // CREATE
  createCoach(data: {personId: number; isAdmin: number}){
    return this.http.post<Coach>(this.apiUrl, data);
  }

  // UPDATE
  updateCoach(id: number, coach: Partial<Coach>): Observable<Coach> {
    return this.http.put<Coach>(`${this.apiUrl}/${id}`, coach);
  }

  // DELETE
  deleteCoach(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
