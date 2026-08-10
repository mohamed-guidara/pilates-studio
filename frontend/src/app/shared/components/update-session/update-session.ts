import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Session } from '../../models/session.model';
import { SessionService } from '../../../services/sessionService.service';
import { CoachService } from '../../../services/coachService.service';
import { PersonsService } from '../../../services/personService.service';
import { RoomService } from '../../../services/roomService.service';
import { Room } from '../../models/room.model';
import { FeedbackMessage } from '../feedback-message/feedback-message';

@Component({
  selector: 'update-session',
  standalone: true,
  imports: [FormsModule, RouterLink, FeedbackMessage],
  templateUrl: './updateSession.html',
})
export class UpdateSession implements OnInit {
  sessionId = -1;
  session = signal<Session | null>(null);
  coachOptions = signal<{ coachId: number; fullName: string }[]>([]);
  rooms = signal<Room[]>([]);
  pageErrorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(
    private sessionService: SessionService,
    private coachService: CoachService,
    private personsService: PersonsService,
    private roomService: RoomService, 
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const rawId = params.get('id');
      const id = Number(rawId);
      if (id > 0) {
        this.sessionId = id;
        this.loadSession(id);
      } else {
        this.pageErrorMessage.set('Invalid session id.');
      }
    });
  }

  private loadSession(id: number) {
    this.pageErrorMessage.set(null);
    this.successMessage.set(null);

    forkJoin({
      session: this.sessionService.getSession(id),
      coaches: this.coachService.getCoaches(),
      persons: this.personsService.getPersons(),
      rooms: this.roomService.getRooms(),
    }).subscribe({
      next: ({ session, coaches, persons, rooms }) => {
        this.session.set(session);
        this.rooms.set(rooms);
        this.coachOptions.set(
          coaches.map((coach) => {
            const person = persons.find((p) => p.personId === coach.personId);
            return {
              coachId: coach.coachId,
              fullName: person ? `${person.firstName} ${person.lastName}` : `Coach #${coach.coachId}`,
            };
          })
        );
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Unable to load session data.');
        console.error('Error loading session:', err);
      },
    });
  }

  updateSessionField<K extends keyof Session>(key: K, value: Session[K]) {
    const current = this.session();
    if (current) {
      this.session.set({ ...current, [key]: value });
    }
  }

  saveSession() {
    const session = this.session();
    if (!session) {
      this.pageErrorMessage.set('Unable to save. Session data is not loaded.');
      return;
    }

    this.pageErrorMessage.set(null);
    this.successMessage.set(null);

    this.sessionService.updateSession(session.sessionId, {
      coachId: session.coachId,
      roomId: session.roomId,
      level: session.level,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      places: session.places,
    }).subscribe({
      next: () => {
        this.router.navigate(['/admin/sessions'], {
          queryParams: { success: 'Session updated successfully.' },
          replaceUrl: true,
        });
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Could not update session. Please try again.');
        console.error('Error updating session:', err);
      },
    });
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
}