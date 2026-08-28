export const BOOKING_CUTOFF_MS = 2 * 60 * 60 * 1000; // 2 hours before session start

export function getSessionStartMs(session: { date: string; startTime: string }): number {
  // date is 'YYYY-MM-DD', startTime is 'HH:mm:ss' — no 'Z' suffix, so this parses as local time.
  return new Date(`${session.date}T${session.startTime}`).getTime();
}

/** True once we're within 2 hours of the session's start (or the session has already started/passed). */
export function isBookingClosed(session: { date: string; startTime: string }, nowMs: number = Date.now()): boolean {
  return nowMs >= getSessionStartMs(session) - BOOKING_CUTOFF_MS;
}