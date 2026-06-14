import "server-only";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type { Payment } from "@/types/payment";

const COLLECTION = "payments";
const col = () => adminDb.collection(COLLECTION);

function toPayment(id: string, d: DocumentData): Payment {
  return {
    id,
    bookingId: String(d.bookingId ?? ""),
    clientUid: String(d.clientUid ?? ""),
    providerId: String(d.providerId ?? ""),
    amount: Number(d.amount ?? 0),
    paymentKey: String(d.paymentKey ?? ""),
    orderId: String(d.orderId ?? ""),
    status: (d.status as "SUCCESS" | "FAILED") || "SUCCESS",
    paidAt: (d.paidAt as Timestamp | undefined)?.toDate?.() ?? new Date(),
  };
}

export const paymentRepository = {
  async getByBookingId(bookingId: string): Promise<Payment | null> {
    const snap = await col().where("bookingId", "==", bookingId).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return toPayment(doc.id, doc.data());
  },

  async create(payment: Omit<Payment, "id" | "paidAt">): Promise<string> {
    const docRef = col().doc();
    await docRef.set({
      ...payment,
      paidAt: Timestamp.now(),
    });
    return docRef.id;
  },
};
