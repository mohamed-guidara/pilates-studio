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
  templateUrl: './session-booking.html',
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

        // Waiting has no sessionId, so a waiting-list entry can only be tied back to a
        // session via reservationId. That works once a reservation exists (the
        // waiting-promotion flow you described), but a waiting-list entry created with
        // reservationId = null (join-waiting-list-without-booking) can't be matched to a
        // session at all with the current model — see the note on joinWaitingList() below.
        if (activeReservation) {
          const relatedWaiting = waitings.find(
            (w) => w.reservationId === activeReservation.reservationId && w.status === 1,
          );
          this.myWaiting.set(relatedWaiting ?? null);
        }

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

    // Two known gaps here, both need a decision before this ships:
    // 1) WaitingService.createWaiting() types reservationId as a required number, but
    //    joining the waiting list happens *before* any reservation exists. Passing null
    //    until the service signature allows (reservationId: number | null).
    // 2) Waiting has no sessionId. Once created, there is no reliable way for this modal
    //    (or any other screen) to determine which session this entry is for, so the
    //    duplicate-waiting-list guard above only works after promotion (once a
    //    reservation + reservationId exist). Recommend adding a sessionId column to
    //    Waiting so a client's waiting-list entries can be matched back to sessions.
    this.waitingService
      .createWaiting({ sessionId: this.session.sessionId , reservationId: null as unknown as number, clientId: this.clientId, status: '1' })
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