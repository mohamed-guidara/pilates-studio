export const RESERVATION_EXPIRY_MS = 1 * 60 * 1000; // 20 minutes

export function getRemainingMs(createdAt: string, nowMs: number = Date.now()): number {
  const elapsed = nowMs - new Date(createdAt).getTime();
  return Math.max(0, RESERVATION_EXPIRY_MS - elapsed);
}

export function formatRemainingTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}