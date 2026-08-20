import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ReservationService } from '../../../services/reservationService.service';
import { WaitingService } from '../../../services/waitingService.service';
import { Reservation } from '../../models/reservation.model';
import { Waiting } from '../../models/waiting.model';
import { Session } from '../../models/session.model';
import { SessionLevelPipe } from '../../../assets/session-level-pipe';
import { SessionCategoryPipe } from '../../../assets/session-category-pipe';

type SessionWithExtras = Session & { coachName?: string; roomNumber?: string; reservedCount?: number };

@Component({
  selector: 'session-booking-modal',
  standalone: true,
  imports: [CommonModule, SessionLevelPipe, SessionCategoryPipe],
  templateUrl: './sessionBooking.html',
})
export class SessionBookingModal implements OnChanges {
  @Input() show = signal(false);
  @Input() session: SessionWithExtras | null = null;
  @Input() clientId: number | null = null;
  @Output() close = new EventEmitter<void>();

  isLoading = signal(true);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  /** This client's existing reservation for this session, if any (status 1 = pending payment, 2 = confirmed). */
  myReservation = signal<Reservation | null>(null);
  /** This client's existing waiting-list entry for this session, if any (status 1 = waiting). */
  myWaiting = signal<Waiting | null>(null);

  constructor(
    private reservationService: ReservationService,
    private waitingService: WaitingService,
    private router: Router,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['session'] || !this.session) {
      return;
    }

    if (this.clientId === null) {
      // Without a resolved clientId we can't check booking status or let the
      // client book — surface that instead of leaving the spinner running forever.
      this.isLoading.set(false);
      this.myReservation.set(null);
      this.myWaiting.set(null);
      this.errorMessage.set('Unable to determine your client account. Please try logging in again.');
      return;
    }

    this.loadMyStatus(this.session.sessionId, this.clientId);
  }

  private loadMyStatus(sessionId: number, clientId: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.myReservation.set(null);
    this.myWaiting.set(null);

    forkJoin({
      reservations: this.reservationService.getReservations(),
      waitings: this.waitingService.getWaitings(),
    }).subscribe({
      next: ({ reservations, waitings }) => {
        const activeReservation = reservations.find(
          (r) => r.sessionId === sessionId && r.clientId === clientId && (r.status === 1 || r.status === 2),
        );
        this.myReservation.set(activeReservation ?? null);

        // Waiting now carries its own sessionId, so this works whether or not a
        // reservation has been created yet (i.e. before and after promotion).
        const activeWaiting = waitings.find(
          (w) => w.sessionId === sessionId && w.clientId === clientId && w.status === 1,
        );
        this.myWaiting.set(activeWaiting ?? null);

        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Unable to load booking status.');
        console.error('Error loading booking status:', err);
        this.isLoading.set(false);
      },
    });
  }

  get isFull(): boolean {
    if (!this.session) return false;
    return (this.session.reservedCount ?? 0) >= this.session.places;
  }

  bookPlace(): void {
    if (!this.session || this.clientId === null || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.reservationService
      .createReservation({ sessionId: this.session.sessionId, clientId: this.clientId, status: '1' })
      .subscribe({
        next: (reservation) => {
          this.isSubmitting.set(false);
          // Payment page isn't built yet — this route is a placeholder for it.
          this.router.navigate(['/payment', reservation.reservationId]);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(this.extractErrorMessage(err) || 'Could not book this session. Please try again.');
          console.error('Error creating reservation:', err);
        },
      });
  }

  joinWaitingList(): void {
    if (!this.session || this.clientId === null || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    // Two gaps in WaitingService.createWaiting()'s current type signature:
    // 1) reservationId is typed as a required number, but joining the waiting list
    //    happens before any reservation exists — passing null until it's widened to
    //    (reservationId: number | null).
    // 2) Its data type doesn't include sessionId at all, even though Waiting now has
    //    that column — passing it via an `as any` cast until the signature is updated
    //    to accept { sessionId: number; reservationId: number | null; clientId: number; status: string }.
    this.waitingService
      .createWaiting({
        reservationId: null as unknown as number,
        clientId: this.clientId,
        status: '1',
        sessionId: this.session.sessionId,
      } as any)
      .subscribe({
        next: (waiting) => {
          this.isSubmitting.set(false);
          this.myWaiting.set(waiting);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(this.extractErrorMessage(err) || 'Could not join the waiting list. Please try again.');
          console.error('Error joining waiting list:', err);
        },
      });
  }

  goToPayment(): void {
    const reservation = this.myReservation();
    if (reservation) {
      this.router.navigate(['/payment', reservation.reservationId]);
    }
  }

  closeModal(): void {
    this.close.emit();
  }

  private extractErrorMessage(err: any): string {
    const message = err?.error?.message || err?.message;
    return typeof message === 'string' && message ? message : err?.statusText || 'An unexpected error occurred.';
  }
}