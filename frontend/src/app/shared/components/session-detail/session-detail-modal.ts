import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ReservationService } from '../../../services/reservationService.service';
import { WaitingService } from '../../../services/waitingService.service';
import { ClientService } from '../../../services/clientService.service';
import { PersonsService } from '../../../services/personService.service';
import { Reservation } from '../../models/reservation.model';
import { Waiting } from '../../models/waiting.model';
import { Session } from '../../models/session.model';
import { SessionLevelPipe } from '../../../assets/session-level-pipe';
import { SessionCategoryPipe } from '../../../assets/session-category-pipe';

@Component({
  selector: 'session-detail-modal',
  standalone: true,
  imports: [CommonModule, SessionLevelPipe, SessionCategoryPipe],
  templateUrl: './sessionDetail.html',
})
export class SessionDetailModal implements OnChanges {
  @Input() show = signal(false);
  @Input() session: (Session & { coachName?: string; roomNumber?: string }) | null = null;
  @Output() close = new EventEmitter<void>();

  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  reservations = signal<(Reservation & { clientName?: string })[]>([]);
  waitingList = signal<(Waiting & { clientName?: string })[]>([]);
  actualReservationsNumber = signal(0);

  constructor(
    private reservationService: ReservationService,
    private waitingService: WaitingService,
    private clientService: ClientService,
    private personsService: PersonsService,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['session'] && this.session) {
      this.loadDetails(this.session.sessionId);
    }
  }

  private loadDetails(sessionId: number) {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      reservations: this.reservationService.getReservations(),
      waitings: this.waitingService.getWaitings(),
      clients: this.clientService.getClients(),
      persons: this.personsService.getPersons(),
    }).subscribe({
      next: ({ reservations, waitings, clients, persons }) => {
        const resolveClientName = (clientId: number) => {
          const client = clients.find((c) => c.clientId === clientId);
          const person = client ? persons.find((p) => p.personId === client.personId) : undefined;
          return person ? `${person.firstName} ${person.lastName}` : `Client #${clientId}`;
        };

        const sessionReservations = reservations.filter((r) => r.sessionId === sessionId);
        this.reservations.set(
          sessionReservations.map((r) => ({ ...r, clientName: resolveClientName(r.clientId) }))
        );

        // FIX: Filter sessionReservations instead of all reservations
        const actualReservations = sessionReservations.filter((r) => r.status === 1 || r.status === 2);
        this.actualReservationsNumber.set(actualReservations.length);

        const sessionWaitings = waitings.filter((w) => w.sessionId === sessionId);
        this.waitingList.set(
          sessionWaitings.map((w) => ({ ...w, clientName: resolveClientName(w.clientId) }))
        );

        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Unable to load session details.');
        console.error('Error loading session details:', err);
        this.isLoading.set(false);
      },
    });
  }

  closeModal() {
    this.close.emit();
  }

  getSortedReservations() {
    const statusOrder = [2, 1, 3]; // Confirmed, Waiting, Cancelled
    return [...this.reservations()].sort((a, b) =>
      statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
    );
  }

  getSortedWaitingList() {
    const statusOrder = [2, 1, 3]; // Confirmed, Waiting, Cancelled
    return [...this.waitingList()].sort((a, b) =>
      statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
    );
  }
}