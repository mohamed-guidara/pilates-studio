import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';

import { SessionService } from '../../../services/sessionService.service';
import { CoachService } from '../../../services/coachService.service';
import { PersonsService } from '../../../services/personService.service';
import { RoomService } from '../../../services/roomService.service';
import { ReservationService } from '../../../services/reservationService.service';
import { ClientService } from '../../../services/clientService.service';

import { FeedbackMessage } from '../../../shared/components/feedback-message/feedback-message';
import { SessionCalendar } from '../../../shared/components/session-calendar/session-calendar';
import { SessionBookingModal } from '../../../shared/components/session-booking/session-booking-modal';
import { SessionVM, enrichSessions, resolveCurrentClient } from '../../../shared/utils/session-enrichment.util';
import { categoryColor } from '../../../shared/utils/category-color.util';
import { SessionLevelPipe } from '../../../assets/session-level-pipe';
import { SessionCategoryPipe } from '../../../assets/session-category-pipe';

type ClientViewMode = 'list' | 'calendar';

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

  // ---------- Booking modal ----------

  openBooking(session: SessionVM): void {
    this.selectedSession.set(session);
    this.showBookingModal.set(true);
  }

  closeBooking(): void {
    this.showBookingModal.set(false);
  }
}