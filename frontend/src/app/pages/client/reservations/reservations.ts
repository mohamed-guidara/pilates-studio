import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { SessionService } from '../../../services/sessionService.service';
import { CoachService } from '../../../services/coachService.service';
import { PersonsService } from '../../../services/personService.service';
import { RoomService } from '../../../services/roomService.service';
import { ReservationService } from '../../../services/reservationService.service';
import { WaitingService } from '../../../services/waitingService.service';
import { ClientService } from '../../../services/clientService.service';

import { Reservation } from '../../../shared/models/reservation.model';
import { Waiting } from '../../../shared/models/waiting.model';

import { FeedbackMessage } from '../../../shared/components/feedback-message/feedback-message';
import { SessionVM, enrichSessions, resolveCurrentClient } from '../../../shared/utils/session-enrichment.util';
import { categoryColor } from '../../../shared/utils/category-color.util';
import { SessionCategoryPipe } from '../../../assets/session-category-pipe';

type BookingsTab = 'reservations' | 'waitings';

export type ReservationVM = Reservation & { session?: SessionVM };
export type WaitingVM = Waiting & { session?: SessionVM; linkedReservation?: Reservation };

@Component({
  selector: 'app-client-reservations',
  standalone: true,
  imports: [CommonModule, FeedbackMessage, SessionCategoryPipe],
  templateUrl: './reservations.html',
  styleUrl: './reservations.css',
})
export class ClientReservations implements OnInit {
  activeTab = signal<BookingsTab>('reservations');

  isLoading = signal(true);
  pageErrorMessage = signal<string | null>(null);
  actionErrorMessage = signal<string | null>(null);

  reservations = signal<ReservationVM[]>([]);
  waitings = signal<WaitingVM[]>([]);
  successMessage = signal<string | null>(null);

  categoryColor = categoryColor;

  constructor(
    private sessionService: SessionService,
    private coachService: CoachService,
    private personsService: PersonsService,
    private roomService: RoomService,
    private reservationService: ReservationService,
    private waitingService: WaitingService,
    private clientService: ClientService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const redirectSuccess = this.route.snapshot.queryParamMap.get('success');
    if (redirectSuccess) {
      this.successMessage.set(redirectSuccess);
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }

    this.loadAll();
  }

  loadAll(): void {
    this.pageErrorMessage.set(null);
    this.actionErrorMessage.set(null);
    this.isLoading.set(true);

    forkJoin({
      sessions: this.sessionService.getSessions(),
      coaches: this.coachService.getCoaches(),
      persons: this.personsService.getPersons(),
      rooms: this.roomService.getRooms(),
      reservations: this.reservationService.getReservations(),
      waitings: this.waitingService.getWaitings(),
      clients: this.clientService.getClients(),
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ sessions, coaches, persons, rooms, reservations, waitings, clients }) => {
          const clientId = resolveCurrentClient(clients);

          if (clientId === null) {
            this.pageErrorMessage.set('Unable to determine your client account. Please try logging in again.');
            this.reservations.set([]);
            this.waitings.set([]);
            return;
          }

          const enrichedSessions = enrichSessions(sessions, coaches, persons, rooms, reservations);
          const sessionById = new Map(enrichedSessions.map((s) => [s.sessionId, s]));

          const myReservations: ReservationVM[] = reservations
            .filter((r) => r.clientId === clientId)
            .map((r) => ({ ...r, session: sessionById.get(r.sessionId) }));

          const myWaitings: WaitingVM[] = waitings
            .filter((w) => w.clientId === clientId)
            .map((w) => ({
              ...w,
              session: sessionById.get(w.sessionId),
              linkedReservation:
                w.reservationId != null ? reservations.find((r) => r.reservationId === w.reservationId) : undefined,
            }));

          this.reservations.set(this.sortByDateDesc(myReservations));
          this.waitings.set(this.sortByDateDesc(myWaitings));
        },
        error: (err) => {
          this.pageErrorMessage.set('Unable to load your bookings. Please refresh the page.');
          console.error('Error loading client bookings:', err);
        },
      });
  }

  private sortByDateDesc<T extends { session?: SessionVM }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
      const dateA = a.session?.date ?? '';
      const dateB = b.session?.date ?? '';
      return dateB.localeCompare(dateA);
    });
  }

  setTab(tab: BookingsTab): void {
    this.activeTab.set(tab);
  }

  reservationStatusLabel(status: number): string {
    switch (status) {
      case 1:
        return 'Pending payment';
      case 2:
        return 'Confirmed (paid)';
      case 3:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  waitingStatusLabel(status: number): string {
    switch (status) {
      case 1:
        return 'Waiting';
      case 2:
        return 'Accepted';
      case 3:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  // ---------- Cancel actions ----------

  cancelReservation(reservation: ReservationVM): void {
    if (!confirm('Cancel this reservation?')) return;
    this.actionErrorMessage.set(null);

    this.reservationService
      .updateReservation(reservation.reservationId, {
        sessionId: reservation.sessionId,
        clientId: reservation.clientId,
        status: '3',
      })
      .subscribe({
        next: () => this.loadAll(),
        error: (err) => {
          this.actionErrorMessage.set('Could not cancel this reservation. Please try again.');
          console.error('Error cancelling reservation:', err);
        },
      });
  }

  cancelWaiting(waiting: WaitingVM): void {
    if (!confirm('Leave this waiting list?')) return;
    this.actionErrorMessage.set(null);

    // Same reservationId typing gap noted in session-booking-modal.ts: it's legitimately
    // null here while status is still 'waiting'. Also passing sessionId via `as any`
    // until WaitingService.updateWaiting()'s type includes it.
    this.waitingService
      .updateWaiting(waiting.waitingId, {
        reservationId: waiting.reservationId as unknown as number,
        clientId: waiting.clientId,
        status: '3',
      } as any)
      .subscribe({
        next: () => this.loadAll(),
        error: (err) => {
          this.actionErrorMessage.set('Could not leave the waiting list. Please try again.');
          console.error('Error cancelling waiting entry:', err);
        },
      });
  }
}