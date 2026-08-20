import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { SessionService } from '../../../services/sessionService.service';
import { CoachService } from '../../../services/coachService.service';
import { PersonsService } from '../../../services/personService.service';
import { RoomService } from '../../../services/roomService.service';
import { ReservationService } from '../../../services/reservationService.service';
import { ClientService } from '../../../services/clientService.service';
import { PaymentService } from '../../../services/paymentService.service';

import { Reservation } from '../../../shared/models/reservation.model';
import { SessionVM, enrichSessions, resolveCurrentClient } from '../../../shared/utils/session-enrichment.util';
import { FeedbackMessage } from '../../../shared/components/feedback-message/feedback-message';
import { SessionCategoryPipe } from '../../../assets/session-category-pipe';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, FeedbackMessage, SessionCategoryPipe],
  templateUrl: './payment.html',

})
export class PaymentPage implements OnInit {
  isLoading = signal(true);
  pageErrorMessage = signal<string | null>(null);

  reservation = signal<Reservation | null>(null);
  session = signal<SessionVM | null>(null);

  cardholderName = '';
  cardNumber = '';
  expiration = '';
  securityCode = '';

  isSubmitting = signal(false);
  submitError = signal<string | null>(null);

  private reservationId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: SessionService,
    private coachService: CoachService,
    private personsService: PersonsService,
    private roomService: RoomService,
    private reservationService: ReservationService,
    private clientService: ClientService,
    private paymentService: PaymentService,
  ) {}

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('reservationId');
    const id = Number(rawId);

    if (!id || id <= 0) {
      this.pageErrorMessage.set('Invalid reservation.');
      this.isLoading.set(false);
      return;
    }

    this.reservationId = id;
    this.loadReservation(id);
  }

  private loadReservation(id: number): void {
    this.pageErrorMessage.set(null);
    this.isLoading.set(true);

    forkJoin({
      reservation: this.reservationService.getReservation(id),
      sessions: this.sessionService.getSessions(),
      coaches: this.coachService.getCoaches(),
      persons: this.personsService.getPersons(),
      rooms: this.roomService.getRooms(),
      clients: this.clientService.getClients(),
    }).subscribe({
      next: ({ reservation, sessions, coaches, persons, rooms, clients }) => {
        const myClientId = resolveCurrentClient(clients);
        if (myClientId === null || reservation.clientId !== myClientId) {
          this.pageErrorMessage.set("This reservation doesn't belong to your account.");
          this.isLoading.set(false);
          return;
        }

        const matchingSession = sessions.find((s) => s.sessionId === reservation.sessionId);
        const enriched = matchingSession
          ? enrichSessions([matchingSession], coaches, persons, rooms, [])[0]
          : undefined;

        this.reservation.set(reservation);
        this.session.set(enriched ?? null);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.pageErrorMessage.set('Unable to load this reservation.');
        console.error('Error loading reservation for payment:', err);
        this.isLoading.set(false);
      },
    });
  }

  submitPayment(): void {
    const reservation = this.reservation();
    if (!reservation || this.isSubmitting()) return;

    if (!this.cardholderName.trim() || !this.cardNumber.trim() || !this.expiration.trim() || !this.securityCode.trim()) {
      this.submitError.set('Please fill in all fields.');
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const amount = this.session()?.price ?? 0;

    // NOTE: PaymentService.createPayment() currently requires the caller to supply
    // paymentId, which is unusual (IDs are normally server-generated). Using a
    // placeholder here until that's confirmed/fixed on the backend.
    this.paymentService
      .createPayment({
        paymentId: Date.now(),
        reservationId: reservation.reservationId,
        clientId: reservation.clientId,
        createdAt: new Date().toISOString(),
        amount,
      })
      .subscribe({
        next: () => this.confirmReservation(reservation),
        error: (err) => {
          this.isSubmitting.set(false);
          this.submitError.set('Payment failed. Please try again.');
          console.error('Error creating payment:', err);
        },
      });
  }

  private confirmReservation(reservation: Reservation): void {
    this.reservationService
      .updateReservation(reservation.reservationId, {
        sessionId: reservation.sessionId,
        clientId: reservation.clientId,
        status: '2',
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/client/reservations'], {
            queryParams: { success: 'Payment successful — your reservation is confirmed.' },
          });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.submitError.set(
            'Payment was recorded, but we could not confirm your reservation. Please contact support.',
          );
          console.error('Error confirming reservation after payment:', err);
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/client/reservations']);
  }
}