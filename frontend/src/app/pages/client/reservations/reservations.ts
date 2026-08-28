import { CommonModule } from '@angular/common';
import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
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
import { getRemainingMs, formatRemainingTime } from '../../../shared/utils/reservation-expiry.util';
import { SessionCategoryPipe } from '../../../assets/session-category-pipe';

type BookingsTab = 'reservations' | 'waitings';

export type ReservationVM = Reservation & { session?: SessionVM };
export type WaitingVM = Waiting & { session?: SessionVM; linkedReservation?: Reservation };

/** How often (in seconds) to silently re-fetch while a reservation's client-side
 *  countdown has hit zero but the backend hasn't caught up yet. The backend's
 *  sessions:process-lifecycle command runs once a minute, so there's an inherent
 *  gap between "countdown says 0" and "status is actually 3 in the DB" — this closes
 *  that gap without a manual refresh, instead of displaying a fake "Expired" state. */
const CATCHUP_POLL_SECONDS = 5;

@Component({
  selector: 'app-client-reservations',
  standalone: true,
  imports: [CommonModule, FeedbackMessage, SessionCategoryPipe],
  templateUrl: './reservations.html',
  styleUrl: './reservations.css',
})
export class ClientReservations implements OnInit, OnDestroy {
  activeTab = signal<BookingsTab>('reservations');

  isLoading = signal(true);
  pageErrorMessage = signal<string | null>(null);
  actionErrorMessage = signal<string | null>(null);

  reservations = signal<ReservationVM[]>([]);
  waitings = signal<WaitingVM[]>([]);
  successMessage = signal<string | null>(null);

  sortedReservations = computed(() =>
    [...this.reservations()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  );

  sortedWaitings = computed(() =>
    [...this.waitings()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  );

  /** Ticks every second so the expiry countdown display stays live. Purely visual —
   *  the backend's `sessions:process-lifecycle` scheduled command is what actually
   *  expires reservations now, independent of whether this page is even open. */
  nowMs = signal(Date.now());
  private tickHandle?: ReturnType<typeof setInterval>;
  private secondsSinceLastCatchupPoll = 0;

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

    this.tickHandle = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy(): void {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
    }
  }

  private tick(): void {
    this.nowMs.set(Date.now());

    // A reservation whose countdown hit zero but is still status 1 means the backend
    // hasn't processed it yet — poll quietly every few seconds until it does, so the
    // status pill flips to "Cancelled" on its own instead of us showing "Expired".
    const awaitingBackendCatchup = this.reservations().some((r) => r.status === 1 && this.remainingMs(r) === 0);
    if (!awaitingBackendCatchup) {
      this.secondsSinceLastCatchupPoll = 0;
      return;
    }

    this.secondsSinceLastCatchupPoll++;
    if (this.secondsSinceLastCatchupPoll >= CATCHUP_POLL_SECONDS) {
      this.secondsSinceLastCatchupPoll = 0;
      this.loadAll(false);
    }
  }

  loadAll(showSpinner = true): void {
    this.pageErrorMessage.set(null);
    this.actionErrorMessage.set(null);
    if (showSpinner) this.isLoading.set(true);

    forkJoin({
      sessions: this.sessionService.getSessions(),
      coaches: this.coachService.getCoaches(),
      persons: this.personsService.getPersons(),
      rooms: this.roomService.getRooms(),
      reservations: this.reservationService.getReservations(),
      waitings: this.waitingService.getWaitings(),
      clients: this.clientService.getClients(),
    })
      .pipe(finalize(() => { if (showSpinner) this.isLoading.set(false); }))
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

  // ---------- Status display ----------

  /** The status to actually DISPLAY, as opposed to reservation.status straight from
   *  the DB. Once the countdown hits zero, this optimistically reports 3 (cancelled)
   *  immediately, even though the backend cron may take up to ~1 minute to actually
   *  flip the row — the silent catch-up poll in tick() syncs the real value underneath,
   *  this just avoids showing a stale "Pending payment" pill in the meantime. */
  effectiveReservationStatus(reservation: ReservationVM): number {
    if (reservation.status === 1 && this.remainingMs(reservation) === 0) {
      return 3;
    }
    return reservation.status;
  }

  reservationStatusLabel(reservation: ReservationVM): string {
    switch (this.effectiveReservationStatus(reservation)) {
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

  // ---------- Expiry countdown (pending reservations only) ----------

  remainingMs(reservation: ReservationVM): number {
    return getRemainingMs(reservation.createdAt, this.nowMs());
  }

  remainingLabel(reservation: ReservationVM): string {
    return formatRemainingTime(this.remainingMs(reservation));
  }

  payNow(reservation: ReservationVM): void {
    this.router.navigate(['/payment', reservation.reservationId]);
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
        sessionId: waiting.sessionId,
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