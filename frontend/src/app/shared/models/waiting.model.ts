export interface Waiting {
  waitingId: number;
  sessionId: number;
  reservationId: number | null;
  clientId: number;
  createdAt: string;
  status: number;
}
