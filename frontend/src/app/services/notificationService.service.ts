import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Notification } from '../shared/models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:8000/api/notifications';

  constructor(private http: HttpClient) {}

  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl);
  }

  getNotification(id: number): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/${id}`);
  }

  createNotification(data: {
    clientId: number;
    subject: string;
    content: string;
  }): Observable<Notification> {
    return this.http.post<Notification>(this.apiUrl, data);
  }
}