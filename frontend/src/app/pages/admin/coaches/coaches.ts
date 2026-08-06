import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { CoachService } from '../../../services/coachService.service';
import { PersonsService } from '../../../services/personService.service';

interface Coach {
  coachId: number;
  personId: number;
  isAdmin: number;
}

interface Person {
  personId: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
}

@Component({
  selector: 'app-coaches',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coaches.html',
  styleUrls: ['./coaches.css']
})
export class Coaches implements OnInit {
  isLoading = signal(true);
  coaches = signal<(Coach & { person?: Person })[]>([]);

  constructor(
    private router: Router,
    private coachesService: CoachService,
    private personsService: PersonsService
  ) {}

  ngOnInit() {
    this.loadCoaches();
  }

  loadCoaches() {
    this.isLoading.set(true);

    forkJoin({
      coaches: this.coachesService.getCoaches(),
      persons: this.personsService.getPersons()
    }).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: ({ coaches, persons }) => {
        this.coaches.set(
          coaches.map((coach) => ({
            ...coach,
            person: persons.find((p) => p.personId === coach.personId),
          }))
        );
      },
      error: (err) => console.error('Error loading coaches:', err)
    });
  }

  createCoach() {
    this.router.navigate(['/admin/coaches/create']);
  }

  editCoach(coachId: number) {
    this.router.navigate([`/admin/coaches/${coachId}/edit`]);
  }

  deleteCoach(coachId: number) {
    this.coaches.update(list => list.filter(c => c.coachId !== coachId));
    // TODO: call DELETE /api/coaches/{id}
  }
}