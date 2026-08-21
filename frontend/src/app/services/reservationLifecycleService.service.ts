import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { SessionService } from './sessionService.service';
import { ReservationService } from './reservationService.service';
import { WaitingService } from './waitingService.service';
import { NotificationService } from './notificationService.service';
import { PersonsService } from './personService.service';
import { ClientService } from './clientService.service';

import { Session } from '../shared/models/session.model';
import { Reservation } from '../shared/models/reservation.model';
import { Waiting } from '../shared/models/waiting.model';
import { Person } from '../shared/models/person.model';
import { Client } from '../shared/models/client.model';
import { RESERVATION_EXPIRY_MS } from '../shared/utils/reservation-expiry.util';
import { SessionCategoryPipe } from '../assets/session-category-pipe';

/**
 * Best-effort, FRONTEND-DRIVEN simulation of logic that really belongs on the backend.
 *
 * What it does, each time runCheck() is called:
 *  1. Expires any pending reservation (status 1) older than 20 minutes → status 3,
 *     releasing its place, and notifies that client.
 *  2. For every session with spare capacity, promotes waiting clients (status 1,
 *     oldest first) into new pending reservations (status 1), links the Waiting
 *     entry to the new reservation and flips it to status 2, and notifies that client.
 *
 * Notification content is personalized with the client's first name and the
 * session's date/time. NOTE: category is rendered as "Category #{n}" — swap in the
 * real label once SessionCategoryPipe's mapping is available here.
 *
 * KNOWN LIMITATIONS — read before relying on this in production:
 *  - It only runs when some client's browser happens to call runCheck(). There is no
 *    timer running when nobody has the app open, so expiry/promotion can be delayed
 *    indefinitely if no one visits a page that triggers it.
 *  - There is no server-side locking, so two browser tabs (or two different clients'
 *    sessions) calling this at the same moment could both read the same "capacity"
 *    before either write lands, and both attempt to promote/expire the same records.
 *    The isRunning guard below only prevents overlap *within a single tab*.
 *  - This should be moved to a backend scheduled job running inside a DB transaction
 *    as soon as that's feasible — that's the only way to make it atomic and reliably
 *    time-based rather than "whenever someone happens to load a page".
 */
@Injectable({ providedIn: 'root' })
export class ReservationLifecycleService {
  private isRunning = false;
  private readonly sessionCategoryPipe = new SessionCategoryPipe();

  constructor(
    private sessionService: SessionService,
    private reservationService: ReservationService,
    private waitingService: WaitingService,
    private notificationService: NotificationService,
    private personsService: PersonsService,
    private clientService: ClientService,
  ) {}

  async runCheck(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const [sessions, reservations, waitings, persons, clients] = await Promise.all([
        firstValueFrom(this.sessionService.getSessions()),
        firstValueFrom(this.reservationService.getReservations()),
        firstValueFrom(this.waitingService.getWaitings()),
        firstValueFrom(this.personsService.getPersons()),
        firstValueFrom(this.clientService.getClients()),
      ]);

      const sessionById = new Map(sessions.map((s) => [s.sessionId, s]));
      const firstNameByClientId = new Map<number, string>();
      for (const client of clients) {
        const person = persons.find((p) => p.personId === client.personId);
        if (person) firstNameByClientId.set(client.clientId, person.firstName);
      }

      // Mutated in place as we go so the promotion pass below sees an up-to-date picture.
      const liveReservations = [...reservations];

      await this.expireStaleReservations(liveReservations, sessionById, firstNameByClientId);
      await this.promoteWaitingLists(sessions, liveReservations, waitings, firstNameByClientId);
    } catch (err) {
      console.error('Reservation lifecycle check failed:', err);
    } finally {
      this.isRunning = false;
    }
  }

  private describeSession(session: Session | undefined): string {
    if (!session) return 'your session';
    const dateLabel = new Date(session.date + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const categoryLabel = this.sessionCategoryPipe.transform(session.category);
    return `the ${categoryLabel} session on ${dateLabel} from ${session.startTime.slice(0, 5)} to ${session.endTime.slice(0, 5)}`;
  }

  private greet(firstName: string | undefined): string {
    return firstName ? `Hi ${firstName}, ` : 'Hi, ';
  }

  private async expireStaleReservations(
    reservations: Reservation[],
    sessionById: Map<number, Session>,
    firstNameByClientId: Map<number, string>,
  ): Promise<void> {
    const now = Date.now();

    for (const reservation of reservations) {
      if (reservation.status !== 1) continue;
      const ageMs = now - new Date(reservation.createdAt).getTime();
      if (ageMs < RESERVATION_EXPIRY_MS) continue;

      try {
        await firstValueFrom(
          this.reservationService.updateReservation(reservation.reservationId, {
            sessionId: reservation.sessionId,
            clientId: reservation.clientId,
            status: '3',
          }),
        );
        reservation.status = 3; // keep the in-memory copy accurate for promoteWaitingLists()

        const sessionDescription = this.describeSession(sessionById.get(reservation.sessionId));
        const greeting = this.greet(firstNameByClientId.get(reservation.clientId));

        await firstValueFrom(
          this.notificationService.createNotification({
            clientId: reservation.clientId,
            subject: 'Reservation expired',
            content: `${greeting}your pending reservation for ${sessionDescription} has expired because payment wasn't completed within 20 minutes. Your place has been released.`,
          }),
        );
      } catch (err) {
        console.error('Failed to expire reservation', reservation.reservationId, err);
      }
    }
  }

  private async promoteWaitingLists(
    sessions: Session[],
    reservations: Reservation[],
    waitings: Waiting[],
    firstNameByClientId: Map<number, string>,
  ): Promise<void> {
    for (const session of sessions) {
      const occupied = reservations.filter(
        (r) => r.sessionId === session.sessionId && (r.status === 1 || r.status === 2),
      ).length;

      let capacity = session.places - occupied;
      if (capacity <= 0) continue;

      // First come, first served.
      const queue = waitings
        .filter((w) => w.sessionId === session.sessionId && w.status === 1)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      for (const waiting of queue) {
        if (capacity <= 0) break;

        try {
          const newReservation = await firstValueFrom(
            this.reservationService.createReservation({
              sessionId: session.sessionId,
              clientId: waiting.clientId,
              status: '1',
            }),
          );

          // NOTE: same signature gap flagged before — WaitingService.updateWaiting()'s
          // type doesn't include sessionId. Casting via `as any` until it's widened.
          await firstValueFrom(
            this.waitingService.updateWaiting(waiting.waitingId, {
              reservationId: newReservation.reservationId,
              clientId: waiting.clientId,
              status: '2',
              sessionId: session.sessionId,
            } as any),
          );

          const sessionDescription = this.describeSession(session);
          const greeting = this.greet(firstNameByClientId.get(waiting.clientId));

          await firstValueFrom(
            this.notificationService.createNotification({
              clientId: waiting.clientId,
              subject: 'A place opened up!',
              content: `${greeting}a place became available for ${sessionDescription} that you were waiting on. Please complete payment within 20 minutes or your reservation will expire and the place will be released again.`,
            }),
          );

          capacity -= 1;
        } catch (err) {
          console.error('Failed to promote waiting entry', waiting.waitingId, err);
        }
      }
    }
  }
}