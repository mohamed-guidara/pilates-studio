import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { SessionService } from '../../../services/sessionService.service';
import { CoachService } from '../../../services/coachService.service';
import { PersonsService } from '../../../services/personService.service';
import { RoomService } from '../../../services/roomService.service';
import { CreateSession } from '../../../shared/components/create-session/create-session';
import { FeedbackMessage } from '../../../shared/components/feedback-message/feedback-message';
import { SessionDetailModal } from "../../../shared/components/session-detail/session-detail-modal";
import { ReservationService } from '../../../services/reservationService.service';
import { SessionLevelPipe } from '../../../assets/session-level-pipe';
import { SessionCategoryPipe } from '../../../assets/session-category-pipe';
import { SessionCalendar } from '../../../shared/components/session-calendar/session-calendar';
import { SessionVM, buildCoachOptions, enrichSessions, resolveCurrentCoach } from '../../../shared/utils/session-enrichment.util';
import { Room } from '../../../shared/models/room.model';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [
    CommonModule,
    CreateSession,
    RouterLink,
    FeedbackMessage,
    SessionDetailModal,
    SessionCalendar,
    SessionLevelPipe,
    SessionCategoryPipe,
  ],
  templateUrl: './sessions.html',
  styleUrl: './sessions.css',
})
export class Sessions implements OnInit {
  isLoading = signal(true);
  sessions = signal<SessionVM[]>([]);
  coachOptions = signal<{ coachId: number; fullName: string }[]>([]);
  rooms = signal<Room[]>([]);
  /** The logged-in admin's own coachId (admins are coaches with isAdmin = 1), used by the calendar's "show only mine" filter. */
  myCoachId = signal<number | null>(null);

  showCreateModal = signal(false);
  isCreating = signal(false);
  createErrorMessage = signal<string | null>(null);
  pageErrorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  showDetailModal = signal(false);
  selectedSession = signal<SessionVM | null>(null);

  /** Toggles between the original table and the shared calendar view, in place. */
  viewAsCalendar = signal(false);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private sessionService: SessionService,
    private coachService: CoachService,
    private personsService: PersonsService,
    private roomService: RoomService,
    private reservationService: ReservationService,
  ) {}

  ngOnInit() {
    const redirectSuccess = this.route.snapshot.queryParamMap.get('success');
    if (redirectSuccess) {
      this.successMessage.set(redirectSuccess);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
    }

    this.loadSessions();
  }

  toggleCalendarView(): void {
    this.viewAsCalendar.update((v) => !v);
  }

  loadSessions() {
    this.pageErrorMessage.set(null);
    this.isLoading.set(true);

    forkJoin({
      sessions: this.sessionService.getSessions(),
      coaches: this.coachService.getCoaches(),
      persons: this.personsService.getPersons(),
      rooms: this.roomService.getRooms(),
      reservations: this.reservationService.getReservations(),
    }).pipe(
      finalize(() => {
        this.isLoading.set(false);
      })
    ).subscribe({
      next: ({ sessions, coaches, persons, rooms, reservations }) => {
        this.rooms.set(rooms);
        this.coachOptions.set(buildCoachOptions(coaches, persons));
        const sortedSessions = enrichSessions(sessions, coaches, persons, rooms, reservations)
          .sort((first, second) => {
            const dateDifference = this.sessionTimestamp(second) - this.sessionTimestamp(first);
            return dateDifference || second.sessionId - first.sessionId;
          });
        this.sessions.set(sortedSessions);
        this.myCoachId.set(resolveCurrentCoach(coaches).coachId);
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Unable to load sessions. Please refresh the page.');
        console.error('Error loading sessions:', err);
      }
    });
  }

  private sessionTimestamp(session: SessionVM): number {
    return new Date(`${session.date}T${session.startTime}`).getTime();
  }

  createSession() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.createErrorMessage.set(null);
    this.showCreateModal.set(false);
  }

  handleCreate(newSession: {
    coachId: number;
    roomId: number;
    level: number;
    date: string;
    startTime: string;
    endTime: string;
    places: number;
    price: number;
    category: number
  }) {
    this.createErrorMessage.set(null);
    this.pageErrorMessage.set(null);
    this.isCreating.set(true);

    this.sessionService.createSession(newSession).pipe(
      finalize(() => this.isCreating.set(false))
    ).subscribe({
      next: () => {
        this.successMessage.set('Session created successfully.');
        this.showCreateModal.set(false);
        this.loadSessions();
      },
      error: (err) => {
        this.createErrorMessage.set(this.extractErrorMessage(err) || 'Could not create session. Please try again.');
        console.error('Error creating session:', err);
      }
    });
  }

  deleteSession(id: number) {
    if (!confirm('Delete this session?')) {
      return;
    }

    this.sessionService.deleteSession(id).subscribe({
      next: () => {
        this.successMessage.set('Session deleted successfully.');
        this.loadSessions();
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Could not delete session. Please try again.');
        console.error('Error deleting session:', err);
      }
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

  openSessionDetails(session: SessionVM) {
    this.selectedSession.set(session);
    this.showDetailModal.set(true);
  }

  closeDetailModal() {
    this.showDetailModal.set(false);
  }
}