import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
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
import { Reservation } from '../../../shared/models/reservation.model';

interface RushHourInsight {
  hour: number;
  label: string;
  count: number;
  percentage: number;
}

interface CoachWorkloadInsight {
  coachId: number;
  name: string;
  count: number;
}

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
  reservations = signal<Reservation[]>([]);
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
        this.reservations.set(reservations);
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

  // ---------- "Smart" insights (plain frequency stats on top of the same data
  // already loaded above — dressed up as AI-driven predictions in the UI, but it's
  // just counting and sorting) ----------

  /** Top 3 busiest start-hours across this calendar month's active (non-cancelled)
   *  reservations — a simple "which hour fills up the most" count, not a forecast
   *  model. */
  rushHourInsights = computed<RushHourInsight[]>(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sessionById = new Map(this.sessions().map((s) => [s.sessionId, s]));

    const hourCounts = new Map<number, number>();
    for (const r of this.reservations()) {
      if (r.status === 3) continue; // cancelled reservations aren't real demand
      const session = sessionById.get(r.sessionId);
      if (!session || !session.date.startsWith(monthKey)) continue;

      const hour = parseInt(session.startTime.slice(0, 2), 10);
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    }

    const total = [...hourCounts.values()].reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    return [...hourCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, count]) => ({
        hour,
        label: `${String(hour).padStart(2, '0')}:00`,
        count,
        percentage: Math.round((count / total) * 100),
      }));
  });

  /** Active (non-cancelled) reservation count per coach for sessions in the next 7
   *  days, ranked busiest-first — a plain workload count, not a scheduling model. Top
   *  5 shown; admins adjust schedules manually based on this. */
  coachWorkload = computed<CoachWorkloadInsight[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const sessionById = new Map(this.sessions().map((s) => [s.sessionId, s]));
    const counts = new Map<number, number>();

    for (const r of this.reservations()) {
      if (r.status === 3) continue;
      const session = sessionById.get(r.sessionId);
      if (!session) continue;

      const sessionDate = new Date(`${session.date}T00:00:00`);
      if (sessionDate < today || sessionDate >= weekEnd) continue;

      counts.set(session.coachId, (counts.get(session.coachId) ?? 0) + 1);
    }

    const coachNameById = new Map(this.coachOptions().map((c) => [c.coachId, c.fullName]));

    return [...counts.entries()]
      .map(([coachId, count]) => ({ coachId, name: coachNameById.get(coachId) ?? `Coach #${coachId}`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });

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