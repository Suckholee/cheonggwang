import "server-only";
import {
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";
import { adminDb } from "./admin";
import {
  buildProviderResponseId,
  type ProviderResponse,
  type ProviderResponseStatus,
} from "@/types/provider-response";

const COLLECTION = "providerResponses";
const col = () => adminDb.collection(COLLECTION);

function tsToDate(ts: Timestamp | undefined): Date {
  return ts?.toDate?.() ?? new Date();
}

function toProviderResponse(id: string, d: DocumentData): ProviderResponse {
  return {
    id,
    providerId: (d.providerId as string) ?? "",
    requestId: (d.requestId as string) ?? "",
    status: (d.status as ProviderResponseStatus) ?? "passed",
    respondedAt: tsToDate(d.respondedAt as Timestamp | undefined),
  };
}

export const providerResponseRepository = {
  async get(
    providerId: string,
    requestId: string,
  ): Promise<ProviderResponse | null> {
    const id = buildProviderResponseId(providerId, requestId);
    const snap = await col().doc(id).get();
    if (!snap.exists) return null;
    return toProviderResponse(snap.id, snap.data()!);
  },

  async upsertPassed(providerId: string, requestId: string): Promise<void> {
    const id = buildProviderResponseId(providerId, requestId);
    await col().doc(id).set(
      {
        providerId,
        requestId,
        status: "passed" as ProviderResponseStatus,
        respondedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  },

  /** Set of requestIds that this provider has already passed or quoted */
  async listRespondedRequestIds(providerId: string): Promise<Set<string>> {
    const snap = await col()
      .where("providerId", "==", providerId)
      .where("status", "in", ["passed", "quoted"])
      .get();
    const set = new Set<string>();
    snap.docs.forEach((d) => {
      const rid = d.data().requestId;
      if (typeof rid === "string") set.add(rid);
    });
    return set;
  },
};
