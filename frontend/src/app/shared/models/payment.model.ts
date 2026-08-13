export interface Payment {
  paymentId: number;
  reservationId: number;
  clientId: number;
  createdAt: string;
  amount: number;
}
