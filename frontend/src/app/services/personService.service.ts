import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Person } from '../shared/models/person.model';

@Injectable({
  providedIn: 'root'
})
export class PersonsService {
  private apiUrl = 'http://localhost:8000/api/persons';

  constructor(private http: HttpClient) {}

  // READ all
  getPersons(): Observable<Person []> {
    return this.http.get<Person[]>(this.apiUrl);
  }

  // READ one
  getPerson(id: number): Observable<Person> {
    return this.http.get<Person>(`${this.apiUrl}/${id}`);
  }

  // CREATE
  createPerson(data: {firstName: string; lastName: string; birthDate: string; email: string; password: string}) {
    return this.http.post<any>(this.apiUrl, data);
  }

  // UPDATE
  updatePerson(id: number, person: Person): Observable<Person> {
    return this.http.put<Person>(`${this.apiUrl}/${id}`, person);
  }

  // DELETE
  deletePerson(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
