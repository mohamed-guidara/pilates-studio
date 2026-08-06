import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Person {
  personId: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class PersonsService {
  private apiUrl = 'http://localhost:8000/api/persons';

  constructor(private http: HttpClient) {}

  getPersons(): Observable<Person[]> {
    return this.http.get<Person[]>(this.apiUrl);
  }

  getPerson(id: number): Observable<Person> {
    return this.http.get<Person>(`${this.apiUrl}/${id}`);
  }
}
