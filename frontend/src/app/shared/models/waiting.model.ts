export interface Waiting {
  waitingId: number;
  reservationId: number | null;
  clientId: number;
  createdAt: string;
  status: number;
}
