import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';

import { SessionService } from '../../../services/sessionService.service';
import { CoachService } from '../../../services/coachService.service';
import { PersonsService } from '../../../services/personService.service';
import { RoomService } from '../../../services/roomService.service';
import { ReservationService } from '../../../services/reservationService.service';

import { FeedbackMessage } from '../../../shared/components/feedback-message/feedback-message';
import { SessionCalendar } from '../../../shared/components/session-calendar/session-calendar';
import { SessionVM, enrichSessions, resolveCurrentCoach } from '../../../shared/utils/session-enrichment.util';

@Component({
  selector: 'app-coach-sessions',
  standalone: true,
  imports: [CommonModule, FeedbackMessage, SessionCalendar],
  templateUrl: './sessions.html',
})
export class CoachSessions implements OnInit {
  isLoading = signal(true);
  pageErrorMessage = signal<string | null>(null);
  sessions = signal<SessionVM[]>([]);
  myCoachId = signal<number | null>(null);

  constructor(
    private sessionService: SessionService,
    private coachService: CoachService,
    private personsService: PersonsService,
    private roomService: RoomService,
    private reservationService: ReservationService,
  ) {}

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.pageErrorMessage.set(null);
    this.isLoading.set(true);

    forkJoin({
      sessions: this.sessionService.getSessions(),
      coaches: this.coachService.getCoaches(),
      persons: this.personsService.getPersons(),
      rooms: this.roomService.getRooms(),
      reservations: this.reservationService.getReservations(),
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ sessions, coaches, persons, rooms, reservations }) => {
          this.sessions.set(enrichSessions(sessions, coaches, persons, rooms, reservations));
          this.myCoachId.set(resolveCurrentCoach(coaches).coachId);
        },
        error: (err) => {
          this.pageErrorMessage.set('Unable to load your schedule. Please refresh the page.');
          console.error('Error loading coach sessions:', err);
        },
      });
  }
}