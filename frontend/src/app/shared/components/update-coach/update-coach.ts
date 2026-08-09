import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Coach } from '../../models/coach.model';
import { Person } from '../../models/person.model';
import { CoachService } from '../../../services/coachService.service';
import { PersonsService } from '../../../services/personService.service';
import { FeedbackMessage } from '../feedback-message/feedback-message';

@Component({
  selector: 'update-coach',
  standalone: true,
  imports: [FormsModule, RouterLink, FeedbackMessage],
  templateUrl: './updateCoach.html',
})
export class UpdateCoach implements OnInit {
  coachId = -1;
  coach = signal<(Coach & { person?: Person }) | null>(null);
  coachPerson = signal<Person | null>(null);
  password = signal(''); // API requires password, empty if unchanged
  pageErrorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(
    private coachesService: CoachService,
    private personsService: PersonsService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    console.log('ngOnInit ran');
    this.route.paramMap.subscribe((params) => {
      const rawId = params.get('id');
      console.log('raw id from route:', rawId); // ADD THIS
      const id = Number(rawId);
      if (id > 0) {
        this.coachId = id;
        this.loadCoach(id);
      } else {
        console.warn('Invalid coach id, skipping load:', rawId);
      }
    });
  }

  private loadCoach(id: number) {
    this.pageErrorMessage.set(null);
    this.successMessage.set(null);

    this.coachesService.getCoach(id).subscribe({
      next: (c) => {
        this.coach.set(c);
        this.personsService.getPerson(c.personId).subscribe({
          next: (p) => this.coachPerson.set(p),
          error: (err) => {
            this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Unable to load coach person data.');
            console.error('Error loading person:', err);
          },
        });
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Unable to load coach data.');
        console.error('Error loading coach:', err);
      },
    });
  }

  updatePersonField<K extends keyof Person>(key: K, value: Person[K]) {
    const current = this.coachPerson();
    if (current) this.coachPerson.set({ ...current, [key]: value });
  }

  updateCoachField<K extends keyof Coach>(key: K, value: Coach[K]) {
    const current = this.coach();
    if (current) this.coach.set({ ...current, [key]: value } as Coach & { person?: Person });
  }

  private extractErrorMessage(err: any): string {
    const message = err?.error?.message || err?.message;
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

    return err?.statusText || 'An unexpected error occurred.';
  }

  saveCoach() {
    const coach = this.coach();
    const coachPerson = this.coachPerson();
    if (!coach || !coachPerson) {
      this.pageErrorMessage.set('Unable to save. Coach data is not loaded.');
      return;
    }

    this.pageErrorMessage.set(null);
    this.successMessage.set(null);

    this.personsService
      .updatePerson(coachPerson.personId, {
        ...coachPerson,
        password: this.password() || '',
      })
      .subscribe({
        next: (updatedPerson) => {
          this.coachPerson.set(updatedPerson);

          this.coachesService
            .updateCoach(coach.coachId, {
              personId: coachPerson.personId,
              isAdmin: coach.isAdmin,
            })
            .subscribe({
              next: (updatedCoach) => {
                this.coach.set({ ...updatedCoach, person: updatedPerson });
                this.router.navigate(['/admin/coaches'], {
                  queryParams: { success: 'Coach updated successfully.' },
                  replaceUrl: true,
                });
              },
              error: (err) => {
                this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Could not update coach. Please try again.');
                console.error('Error updating coach:', err);
              },
            });
        },
        error: (err) => {
          this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Could not update coach personal details. Please try again.');
          console.error('Error updating person:', err);
        },
      });
  }
}
