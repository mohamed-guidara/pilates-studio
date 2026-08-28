/**
 * DISPLAY-ONLY. This does not control when a reservation actually expires — that's
 * governed entirely by config('booking.reservation_expiry_minutes') on the backend
 * (config/booking.php, overridable via .env's RESERVATION_EXPIRY_MINUTES), enforced
 * by ProcessSessionLifecycle and ReservationController.
 *
 * This constant only affects what the countdown on screen shows. If it doesn't match
 * the backend's value, the visible countdown will just be wrong (e.g. showing
 * "Expired" a few minutes before or after the real expiry) — it can never cause a
 * reservation to be treated as expired/not-expired incorrectly server-side, since
 * every payment attempt is re-validated against the real backend value regardless of
 * what this file says. Keep them equal for a countdown that matches reality, but
 * mismatching them is a cosmetic bug, not a correctness one.
 */
export const RESERVATION_EXPIRY_MS = 5 * 60 * 1000; // MUST match config('booking.reservation_expiry_minutes') on the backend

export function getRemainingMs(createdAt: string, nowMs: number = Date.now()): number {
  // Laravel returns the database timestamp without a timezone. Treat it as UTC,
  // matching the backend application timezone, instead of the browser's local timezone.
  const timestamp = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(createdAt) ? createdAt : `${createdAt}Z`;
  const elapsed = nowMs - new Date(timestamp).getTime();
  return Math.max(0, RESERVATION_EXPIRY_MS - elapsed);
}

export function formatRemainingTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}