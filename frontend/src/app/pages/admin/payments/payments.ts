import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import { FeedbackMessage } from '../../../shared/components/feedback-message/feedback-message';
import { Payment } from '../../../shared/models/payment.model';
import { PaymentService } from '../../../services/paymentService.service';
import { ClientService } from '../../../services/clientService.service';
import { PersonsService } from '../../../services/personService.service';
import { SessionService } from '../../../services/sessionService.service';
import { ReservationService } from '../../../services/reservationService.service';
import { CoachService } from '../../../services/coachService.service';
import { RoomService } from '../../../services/roomService.service';
import { Client } from '../../../shared/models/client.model';
import { Person } from '../../../shared/models/person.model';
import { Session } from '../../../shared/models/session.model';
import { Coach } from '../../../shared/models/coach.model';
import { Room } from '../../../shared/models/room.model';
import { Reservation } from '../../../shared/models/reservation.model';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FeedbackMessage],
  templateUrl: './payments.html',
  styleUrls: ['./payments.css'],
})
export class Payments implements OnInit {
  isLoading = signal(true);
  payments = signal<Array<Payment & {
    clientName?: string;
    sessionInfo?: string;
    reservationStatus?: string;
  }>>([]);
  pageErrorMessage = signal<string | null>(null);

  constructor(
    private paymentService: PaymentService,
    private clientService: ClientService,
    private personsService: PersonsService,
    private sessionService: SessionService,
    private reservationService: ReservationService,
    private coachService: CoachService,
    private roomService: RoomService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadPayments();
  }

  loadPayments() {
    this.pageErrorMessage.set(null);
    this.isLoading.set(true);

    forkJoin({
      payments: this.paymentService.getPayments(),
      clients: this.clientService.getClients(),
      persons: this.personsService.getPersons(),
      reservations: this.reservationService.getReservations(),
      sessions: this.sessionService.getSessions(),
      coaches: this.coachService.getCoaches(),
      rooms: this.roomService.getRooms(),
    }).pipe(
      finalize(() => {
        this.isLoading.set(false);
        this.cdr.detectChanges();
      }),
    ).subscribe({
      next: ({ payments, clients, persons, reservations, sessions, coaches, rooms }) => {
        this.payments.set(
          [...payments]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((payment) => {
              const client = clients.find((c) => c.clientId === payment.clientId);
              const person = client ? persons.find((p) => p.personId === client.personId) : undefined;
              const reservation = reservations.find((r) => r.reservationId === payment.reservationId);
              const session = reservation ? sessions.find((s) => s.sessionId === reservation.sessionId) : undefined;
              const coach = session ? coaches.find((c) => c.coachId === session.coachId) : undefined;
              const coachPerson = coach ? persons.find((p) => p.personId === coach.personId) : undefined;
              const room = session ? rooms.find((r) => r.roomId === session.roomId) : undefined;

              return {
                ...payment,
                clientName: person ? `${person.firstName} ${person.lastName}` : 'Unknown client',
                sessionInfo: session
                  ? `${session.level} • ${session.date} ${session.startTime?.slice(0, 5)} - ${session.endTime?.slice(0, 5)}`
                  : 'Unknown session',
                reservationStatus: reservation ? this.resolveReservationStatus(reservation.status) : 'Unknown',
              };
            }),
        );
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Unable to load payments. Please refresh the page.');
        console.error('Error loading payments:', err);
      },
    });
  }

  private resolveReservationStatus(status: number): string {
    switch (status) {
      case 1:
        return 'Waiting';
      case 2:
        return 'Confirmed';
      case 3:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
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
}
