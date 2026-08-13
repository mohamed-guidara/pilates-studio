import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { SessionService } from '../../../services/sessionService.service';
import { CoachService } from '../../../services/coachService.service';
import { PersonsService } from '../../../services/personService.service';
import { RoomService } from '../../../services/roomService.service';
import { Session } from '../../../shared/models/session.model';
import { Coach } from '../../../shared/models/coach.model';
import { Person } from '../../../shared/models/person.model';
import { Room } from '../../../shared/models/room.model';
import { CreateSession } from '../../../shared/components/create-session/create-session';
import { FeedbackMessage } from '../../../shared/components/feedback-message/feedback-message';
import { SessionDetailModal } from "../../../shared/components/session-detail/session-detail-modal";
import { ReservationService } from '../../../services/reservationService.service';
import { SessionLevelPipe } from '../../../assets/session-level-pipe';
import { SessionCategoryPipe } from '../../../assets/session-category-pipe';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, CreateSession, RouterLink, FeedbackMessage, SessionDetailModal, SessionLevelPipe, SessionCategoryPipe],
  templateUrl: './sessions.html',
  styleUrl: './sessions.css',
})
export class Sessions implements OnInit {
  isLoading = signal(true);
  sessions = signal<(Session & { coachName?: string; roomNumber?: string; reservedCount?: number })[]>([]);
  coachOptions = signal<{ coachId: number; fullName: string }[]>([]);
  rooms = signal<Room[]>([]);
  showCreateModal = signal(false);
  createErrorMessage = signal<string | null>(null);
  pageErrorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  showDetailModal = signal(false);
  selectedSession = signal<(Session & { coachName?: string; roomNumber?: string; reservedCount?: number }) | null>(null);

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

        // Count only confirmed (2) and waiting (1) reservations
        const reservationCountBySession = reservations.reduce((countMap, reservation) => {
          if (reservation.status === 1 || reservation.status === 2) {
            countMap[reservation.sessionId] = (countMap[reservation.sessionId] || 0) + 1;
          }
          return countMap;
        }, {} as Record<number, number>);

        this.coachOptions.set(
          coaches.map((coach) => {
            const person = persons.find((p) => p.personId === coach.personId);
            return {
              coachId: coach.coachId,
              fullName: person ? `${person.firstName} ${person.lastName}` : `Coach #${coach.coachId}`,
            };
          })
        );
        this.sessions.set(
          sessions.map((session) => {
            const coach = coaches.find((c) => c.coachId === session.coachId);
            const person = coach ? persons.find((p) => p.personId === coach.personId) : undefined;
            const room = rooms.find((r) => r.roomId === session.roomId);

            return {
              ...session,
              coachName: person ? `${person.firstName} ${person.lastName}` : undefined,
              roomNumber: room?.number,
              reservedCount: reservationCountBySession[session.sessionId] || 0,
            };
          })
        );
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Unable to load sessions. Please refresh the page.');
        console.error('Error loading sessions:', err);
      }
    });
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

    this.sessionService.createSession(newSession).subscribe({
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

  openSessionDetails(session: Session & { coachName?: string; roomNumber?: string }) {
    this.selectedSession.set(session);
    this.showDetailModal.set(true);
  }

  closeDetailModal() {
    this.showDetailModal.set(false);
  }
}