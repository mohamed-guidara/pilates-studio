import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Waiting } from '../shared/models/waiting.model';

@Injectable({
  providedIn: 'root'
})
export class WaitingService {
  private apiUrl = 'http://localhost:8000/api/waitings';

  constructor(private http: HttpClient) {}

  getWaitings(): Observable<Waiting[]> {
    return this.http.get<Waiting[]>(this.apiUrl);
  }

  getWaiting(id: number): Observable<Waiting> {
    return this.http.get<Waiting>(`${this.apiUrl}/${id}`);
  }

  createWaiting(data: { reservationId: number; clientId: number; status: string }): Observable<Waiting> {
    return this.http.post<Waiting>(this.apiUrl, data);
  }

  updateWaiting(id: number, data: { reservationId: number; clientId: number; status: string }): Observable<Waiting> {
    return this.http.put<Waiting>(`${this.apiUrl}/${id}`, data);
  }

  deleteWaiting(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
