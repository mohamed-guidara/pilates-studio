import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';

import { SessionService } from '../../../services/sessionService.service';
import { CoachService } from '../../../services/coachService.service';
import { PersonsService } from '../../../services/personService.service';
import { RoomService } from '../../../services/roomService.service';
import { ReservationService } from '../../../services/reservationService.service';
import { ClientService } from '../../../services/clientService.service';

import { Reservation } from '../../../shared/models/reservation.model';
import { FeedbackMessage } from '../../../shared/components/feedback-message/feedback-message';
import { SessionCalendar } from '../../../shared/components/session-calendar/session-calendar';
import { SessionBookingModal } from '../../../shared/components/session-booking/session-booking-modal';
import { SessionVM, enrichSessions, resolveCurrentClient } from '../../../shared/utils/session-enrichment.util';
import { categoryColor } from '../../../shared/utils/category-color.util';
import { SessionCategoryPipe } from '../../../assets/session-category-pipe';

type ClientViewMode = 'list' | 'calendar';

/** Minimum confirmed reservations before we're willing to claim a "pattern" — below
 *  this, a single booking would look like a confident insight when it's really just
 *  one data point. These are plain frequency counts, not a model — kept simple and
 *  transparent on purpose, dressed up in the UI as a "smart pick" for the client. */
const MIN_HISTORY_FOR_PROFILE = 2;

interface ClientBookingProfile {
  bestTime: string | null;
  bestCoachId: number | null;
  bestCoachName: string | null;
  bestCategory: number | null;
  sampleSize: number;
}

@Component({
  selector: 'app-client-sessions',
  standalone: true,
  imports: [
    CommonModule,
    FeedbackMessage,
    SessionCalendar,
    SessionBookingModal,
    SessionCategoryPipe,
  ],
  templateUrl: './sessions.html',
  styleUrl: './sessions.css',
})
export class ClientSessions implements OnInit {
  isLoading = signal(true);
  pageErrorMessage = signal<string | null>(null);
  sessions = signal<SessionVM[]>([]);
  reservations = signal<Reservation[]>([]);
  clientId = signal<number | null>(null);

  viewMode = signal<ClientViewMode>('list');

  showBookingModal = signal(false);
  selectedSession = signal<SessionVM | null>(null);

  categoryColor = categoryColor;

  constructor(
    private sessionService: SessionService,
    private coachService: CoachService,
    private personsService: PersonsService,
    private roomService: RoomService,
    private reservationService: ReservationService,
    private clientService: ClientService,
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
      clients: this.clientService.getClients(),
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ sessions, coaches, persons, rooms, reservations, clients }) => {
          this.sessions.set(enrichSessions(sessions, coaches, persons, rooms, reservations));
          this.reservations.set(reservations);
          this.clientId.set(resolveCurrentClient(clients));
        },
        error: (err) => {
          this.pageErrorMessage.set('Unable to load sessions. Please refresh the page.');
          console.error('Error loading client sessions:', err);
        },
      });
  }

  setViewMode(mode: ClientViewMode): void {
    this.viewMode.set(mode);
  }

  // ---------- List view: every session today or later, soonest first ----------

  private todayKey(): string {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  upcomingSessions(): SessionVM[] {
    const today = this.todayKey();
    return this.sessions()
      .filter((s) => s.date >= today)
      .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));
  }

  formatSessionDate(dateStr: string): string {
    // dateStr is 'YYYY-MM-DD'; parse as local date to avoid timezone drift.
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  private sessionStartMs(session: SessionVM): number {
    return new Date(`${session.date}T${session.startTime}`).getTime();
  }

  // ---------- "Smart" insights (plain frequency stats — see the doc comment above
  // MIN_HISTORY_FOR_PROFILE for the honesty note on what's really happening here) ----------

  /** This client's booking "profile": the time, coach, and category they book most
   *  often, derived only from their CONFIRMED (status 2) history. Returns null if
   *  there isn't enough history yet to say anything meaningful — an empty/near-empty
   *  history should never produce a confident-sounding recommendation. */
  clientProfile = computed<ClientBookingProfile | null>(() => {
    const clientId = this.clientId();
    if (clientId === null) return null;

    const sessionById = new Map(this.sessions().map((s) => [s.sessionId, s]));
    const myConfirmedSessions = this.reservations()
      .filter((r) => r.clientId === clientId && r.status === 2)
      .map((r) => sessionById.get(r.sessionId))
      .filter((s): s is SessionVM => !!s);

    if (myConfirmedSessions.length < MIN_HISTORY_FOR_PROFILE) return null;

    const timeCounts = new Map<string, number>();
    const coachCounts = new Map<number, number>();
    const categoryCounts = new Map<number, number>();

    for (const s of myConfirmedSessions) {
      const timeKey = s.startTime.slice(0, 5);
      timeCounts.set(timeKey, (timeCounts.get(timeKey) ?? 0) + 1);
      coachCounts.set(s.coachId, (coachCounts.get(s.coachId) ?? 0) + 1);
      categoryCounts.set(s.category, (categoryCounts.get(s.category) ?? 0) + 1);
    }

    const bestTime = this.pickTopKey(timeCounts);
    const bestCoachId = this.pickTopKey(coachCounts);
    const bestCategory = this.pickTopKey(categoryCounts);
    const bestCoachName = myConfirmedSessions.find((s) => s.coachId === bestCoachId)?.coachName ?? null;

    return {
      bestTime,
      bestCoachId,
      bestCoachName,
      bestCategory,
      sampleSize: myConfirmedSessions.length,
    };
  });

  /** Up to 3 upcoming, not-yet-booked, not-full sessions that best match the
   *  client's profile — coach match weighted highest, then category, then time. */
  recommendedSessions = computed<SessionVM[]>(() => {
    const profile = this.clientProfile();
    if (!profile) return [];

    const clientId = this.clientId();
    const myActiveSessionIds = new Set(
      this.reservations()
        .filter((r) => r.clientId === clientId && (r.status === 1 || r.status === 2))
        .map((r) => r.sessionId),
    );

    const candidates = this.upcomingSessions().filter(
      (s) => !myActiveSessionIds.has(s.sessionId) && (s.reservedCount ?? 0) < s.places,
    );

    const scored = candidates
      .map((s) => {
        let score = 0;
        if (s.coachId === profile.bestCoachId) score += 2;
        if (s.category === profile.bestCategory) score += 2;
        if (s.startTime.slice(0, 5) === profile.bestTime) score += 3;
        return { session: s, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || this.sessionStartMs(a.session) - this.sessionStartMs(b.session));

    return scored.slice(0, 3).map((x) => x.session);
  });

  private pickTopKey<K>(counts: Map<K, number>): K | null {
    let best: K | null = null;
    let bestCount = 0;
    for (const [key, count] of counts) {
      if (count > bestCount) {
        best = key;
        bestCount = count;
      }
    }
    return best;
  }

  // ---------- Booking modal ----------

  openBooking(session: SessionVM): void {
    this.selectedSession.set(session);
    this.showBookingModal.set(true);
  }

  closeBooking(): void {
    this.showBookingModal.set(false);
  }
}