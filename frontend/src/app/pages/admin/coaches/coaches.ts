import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { CoachService } from '../../../services/coachService.service';
import { PersonsService } from '../../../services/personService.service';
import { Coach } from '../../../shared/models/coach.model';
import { Person } from '../../../shared/models/person.model';
import { CreateCoach } from "../../../shared/components/create-coach/create-coach";





@Component({
  selector: 'app-coaches',
  standalone: true,
  imports: [CommonModule, CreateCoach],
  templateUrl: './coaches.html',
  styleUrls: ['./coaches.css']
})
export class Coaches implements OnInit {
  isLoading = signal(true);
  coaches = signal<(Coach & { person?: Person })[]>([]);


  showCreateModal = signal(false);
  createErrorMessage = signal<string | null>(null);


  constructor(
    private router: Router,
    private coachesService: CoachService,
    private personsService: PersonsService,
    private cdr: ChangeDetectorRef
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
      finalize(() => {
        this.isLoading.set(false);
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: ({ coaches, persons }) => {
        this.coaches.set(
          coaches.map((coach) => ({
            ...coach,
            person: persons.find((p) => p.personId === coach.personId),
          }))
        );
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading coaches:', err);
        this.cdr.detectChanges();
      }
    });
  }

  createCoach() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.createErrorMessage.set(null);
    this.showCreateModal.set(false);
  }

  editCoach(coachId: number) {
    this.router.navigate([`/admin/coaches/${coachId}/edit`]);

  }

  handleCreate(newCoach: { firstName: string; lastName: string; birthDate: string; email: string; password: string; isAdmin: number }) {
    this.createErrorMessage.set(null);

    this.personsService.createPerson({
      firstName: newCoach.firstName,
      lastName: newCoach.lastName,
      birthDate: newCoach.birthDate,
      email: newCoach.email,
      password: newCoach.password
    }).subscribe({
      next: (res) => {
        console.log('person :>> ', res);
        this.coachesService.createCoach({
          personId: res.person.personId,
          isAdmin: newCoach.isAdmin
        }).subscribe({
          next: () => {
            this.showCreateModal.set(false);
            console.log('coach created successfully!!!')
            this.loadCoaches();
          },
          error: (err) => {
            this.createErrorMessage.set(this.extractErrorMessage(err) || 'Could not create coach. Please try again.');
            console.error('Error creating coach:', err);
          }
        });
      },
      error: (err) => {
        this.createErrorMessage.set(this.extractErrorMessage(err) || 'Could not create person. Please try again.');
        console.error('Error creating person:', err);
      }
    });
  }

  private extractErrorMessage(err: any): string {
    const message = err?.error?.message;
    const errors = err?.error?.errors;

    if (typeof message === 'string' && message) {
      return message;
    }

    if (errors && typeof errors === 'object') {
      return Object.values(errors)
        .flatMap((value) => Array.isArray(value) ? value : [value])
        .filter((value): value is string => typeof value === 'string')
        .join(' ');
    }

    return '';
  }






}