import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Session } from '../shared/models/session.model';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private apiUrl = 'http://localhost:8000/api/sessions';

  constructor(private http: HttpClient) {}

  getSessions(): Observable<Session[]> {
    return this.http.get<Session[]>(this.apiUrl);
  }

  getSession(id: number): Observable<Session> {
    return this.http.get<Session>(`${this.apiUrl}/${id}`);
  }

  createSession(data: {
    coachId: number;
    roomId: number;
    level: number;
    date: string;
    startTime: string;
    endTime: string;
    places: number;
    price: number;
    category: number;
  }) {
    return this.http.post<Session>(this.apiUrl, data);
  }

  updateSession(id: number, data: {
    coachId: number;
    roomId: number;
    level: number;
    date: string;
    startTime: string;
    endTime: string;
    places: number;
    price: number;
    category: number;
  }): Observable<Session> {
    return this.http.put<Session>(`${this.apiUrl}/${id}`, data);
  }

  deleteSession(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
