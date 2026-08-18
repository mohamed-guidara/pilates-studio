import { Session } from '../models/session.model';
import { Coach } from '../models/coach.model';
import { Person } from '../models/person.model';
import { Room } from '../models/room.model';
import { Reservation } from '../models/reservation.model';
import { Client } from '../models/client.model';

export type SessionVM = Session & {
  coachName?: string;
  roomNumber?: string;
  reservedCount?: number;
};

/**
 * Enriches raw sessions with coach name, room number, and a reserved-count badge
 * (status 1 = waiting, 2 = confirmed — both count as "taken" places, same as the
 * original sessions table logic). Call this once per page load and reuse the
 * result everywhere on that page (table + calendar) instead of re-deriving it.
 */
export function enrichSessions(
  sessions: Session[],
  coaches: Coach[],
  persons: Person[],
  rooms: Room[],
  reservations: Reservation[],
): SessionVM[] {
  const reservationCountBySession = reservations.reduce((countMap, reservation) => {
    if (reservation.status === 1 || reservation.status === 2) {
      countMap[reservation.sessionId] = (countMap[reservation.sessionId] || 0) + 1;
    }
    return countMap;
  }, {} as Record<number, number>);

  return sessions.map((session) => {
    const coach = coaches.find((c) => c.coachId === session.coachId);
    const person = coach ? persons.find((p) => p.personId === coach.personId) : undefined;
    const room = rooms.find((r) => r.roomId === session.roomId);

    return {
      ...session,
      coachName: person ? `${person.firstName} ${person.lastName}` : undefined,
      roomNumber: room?.number,
      reservedCount: reservationCountBySession[session.sessionId] || 0,
    };
  });
}

export function buildCoachOptions(coaches: Coach[], persons: Person[]): { coachId: number; fullName: string }[] {
  return coaches.map((coach) => {
    const person = persons.find((p) => p.personId === coach.personId);
    return {
      coachId: coach.coachId,
      fullName: person ? `${person.firstName} ${person.lastName}` : `Coach #${coach.coachId}`,
    };
  });
}

/** Resolves the logged-in person's coachId (and admin flag) from localStorage's 'personId'. */
export function resolveCurrentCoach(coaches: Coach[]): { coachId: number | null; isAdmin: boolean } {
  const stored = localStorage.getItem('personId');
  const personId = stored ? Number(stored) : null;
  const coach = personId !== null ? coaches.find((c) => c.personId === personId) : undefined;
  return {
    coachId: coach ? coach.coachId : null,
    isAdmin: coach ? coach.isAdmin === 1 : false,
  };
}

/** Resolves the logged-in person's clientId from localStorage's 'personId'. */
export function resolveCurrentClient(clients: Client[]): number | null {
  const stored = localStorage.getItem('personId');
  const personId = stored ? Number(stored) : null;
  const client = personId !== null ? clients.find((c) => c.personId === personId) : undefined;
  return client ? client.clientId : null;
}