export interface Payment {
  id: string;
  bookingId: string;
  clientUid: string;
  providerId: string;
  amount: number;
  paymentKey: string;
  orderId: string;
  status: "SUCCESS" | "FAILED";
  paidAt: Date;
}
