import "server-only";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type { Thread, ThreadRole } from "@/types/chat";

const COLLECTION = "threads";
const col = () => adminDb.collection(COLLECTION);

function tsToDateOrNull(ts: Timestamp | undefined | null): Date | null {
  return ts?.toDate?.() ?? null;
}

function tsToDate(ts: Timestamp | undefined | null): Date {
  return ts?.toDate?.() ?? new Date();
}

function toThread(id: string, d: DocumentData): Thread {
  return {
    id,
    clientUid: String(d.clientUid ?? ""),
    providerId: String(d.providerId ?? ""),
    providerOwnerUid: String(d.providerOwnerUid ?? ""),
    requestId: String(d.requestId ?? ""),
    quoteId: (d.quoteId as string | null | undefined) ?? null,
    companyName: String(d.companyName ?? ""),
    clientDisplayName: String(d.clientDisplayName ?? ""),
    lastMessageAt: tsToDateOrNull(d.lastMessageAt as Timestamp | null | undefined),
    lastMessagePreview:
      (d.lastMessagePreview as string | null | undefined) ?? null,
    lastMessageSenderUid:
      (d.lastMessageSenderUid as string | null | undefined) ?? null,
    unreadByClient:
      typeof d.unreadByClient === "number" ? (d.unreadByClient as number) : 0,
    unreadByProvider:
      typeof d.unreadByProvider === "number"
        ? (d.unreadByProvider as number)
        : 0,
    createdAt: tsToDate(d.createdAt as Timestamp | undefined),
  };
}

export function resolveThreadRole(
  thread: Thread,
  uid: string,
): ThreadRole | null {
  if (thread.clientUid === uid) return "client";
  if (thread.providerOwnerUid === uid) return "provider";
  return null;
}

export const threadRepository = {
  /**
   * v1.2 #1 chat — 참가자 검증 포함 조회.
   * null 반환 시 Server shell에서 notFound().
   */
  async getWithParticipantCheck(
    threadId: string,
    uid: string,
  ): Promise<Thread | null> {
    const snap = await col().doc(threadId).get();
    if (!snap.exists) return null;
    const thread = toThread(snap.id, snap.data()!);
    if (resolveThreadRole(thread, uid) == null) return null;
    return thread;
  },
};
