import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import { FeedbackMessage } from '../../../shared/components/feedback-message/feedback-message';
import { Waiting } from '../../../shared/models/waiting.model';
import { WaitingService } from '../../../services/waitingService.service';
import { ClientService } from '../../../services/clientService.service';
import { PersonsService } from '../../../services/personService.service';
import { ReservationService } from '../../../services/reservationService.service';
import { SessionService } from '../../../services/sessionService.service';
import { CoachService } from '../../../services/coachService.service';
import { RoomService } from '../../../services/roomService.service';
import { Client } from '../../../shared/models/client.model';
import { Person } from '../../../shared/models/person.model';
import { Reservation } from '../../../shared/models/reservation.model';
import { Session } from '../../../shared/models/session.model';
import { Coach } from '../../../shared/models/coach.model';
import { Room } from '../../../shared/models/room.model';

@Component({
  selector: 'app-waitings',
  standalone: true,
  imports: [CommonModule, FeedbackMessage],
  templateUrl: './waitings.html',
  styleUrls: ['./waitings.css'],
})
export class Waitings implements OnInit {
  isLoading = signal(true);
  waitings = signal<Array<Waiting & {
    clientName?: string;
    sessionInfo?: string;
    sessionLevel?: string;
    sessionDate?: string;
    sessionTime?: string;
    sessionCoach?: string;
    sessionRoom?: string;
    waitingStatus?: string;
  }>>([]);
  pageErrorMessage = signal<string | null>(null);

  constructor(
    private waitingService: WaitingService,
    private clientService: ClientService,
    private personsService: PersonsService,
    private reservationService: ReservationService,
    private sessionService: SessionService,
    private coachService: CoachService,
    private roomService: RoomService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadWaitings();
  }

  loadWaitings() {
    this.pageErrorMessage.set(null);
    this.isLoading.set(true);

    forkJoin({
      waitings: this.waitingService.getWaitings(),
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
      next: ({ waitings, clients, persons, reservations, sessions, coaches, rooms }) => {
        this.waitings.set(
          [...waitings]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((waiting) => {
              const client = clients.find((c) => c.clientId === waiting.clientId);
              const person = client ? persons.find((p) => p.personId === client.personId) : undefined;
              const reservation = reservations.find((r) => r.reservationId === waiting.reservationId);
              const session = reservation ? sessions.find((s) => s.sessionId === reservation.sessionId) : undefined;
              const coach = session ? coaches.find((c) => c.coachId === session.coachId) : undefined;
              const coachPerson = coach ? persons.find((p) => p.personId === coach.personId) : undefined;
              const room = session ? rooms.find((r) => r.roomId === session.roomId) : undefined;

              return {
                ...waiting,
                clientName: person ? `${person.firstName} ${person.lastName}` : 'Unknown client',
                sessionInfo: session
                  ? `${session.level} • ${session.date} ${session.startTime?.slice(0, 5)} - ${session.endTime?.slice(0, 5)}`
                  : 'Unknown session',
                sessionLevel: session ? String(session.level) : undefined,
                sessionDate: session?.date,
                sessionTime: session ? `${session.startTime?.slice(0, 5)} - ${session.endTime?.slice(0, 5)}` : undefined,
                sessionCoach: coachPerson ? `${coachPerson.firstName} ${coachPerson.lastName}` : undefined,
                sessionRoom: room?.number,
                waitingStatus: this.resolveWaitingStatus(waiting.status),
              };
            }),
        );
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Unable to load waitings. Please refresh the page.');
        console.error('Error loading waitings:', err);
      },
    });
  }

  private resolveWaitingStatus(status: number): string {
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
