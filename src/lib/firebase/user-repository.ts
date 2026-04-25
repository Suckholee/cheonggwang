import "server-only";
import { cache } from "react";
import type { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type { UserProfile, UserRole } from "@/types/page";

const COLLECTION = "users";

export interface PartnerFlag {
  isCheonggwangPartner: boolean;
  partnerCleaningFrequency?: string;
}

/**
 * request-scope cached. layout + 페이지가 같은 uid로 동시 호출 시 실 fetch 1회.
 */
async function getUserInner(uid: string): Promise<UserProfile | null> {
  const snap = await adminDb.collection(COLLECTION).doc(uid).get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  const rolesRaw = Array.isArray(d.roles) ? (d.roles as unknown[]) : [];
  const roles: UserRole[] = rolesRaw.filter(
    (r): r is UserRole => r === "client" || r === "provider",
  );
  return {
    uid: snap.id,
    email: (d.email as string) ?? "",
    displayName: (d.displayName as string) ?? "",
    isCheonggwangPartner: d.isCheonggwangPartner === true,
    partnerCleaningFrequency: d.partnerCleaningFrequency as string | undefined,
    roles: roles.length > 0 ? roles : undefined,
    providerId: typeof d.providerId === "string" ? d.providerId : undefined,
    contactPhone:
      typeof d.contactPhone === "string" ? d.contactPhone : undefined,
    createdAt:
      (d.createdAt as Timestamp | undefined)?.toDate?.() ?? new Date(),
  };
}

export const userRepository = {
  get: cache(getUserInner),

  async getPartnerFlag(uid: string): Promise<PartnerFlag> {
    const user = await this.get(uid);
    return {
      isCheonggwangPartner: user?.isCheonggwangPartner ?? false,
      partnerCleaningFrequency: user?.partnerCleaningFrequency,
    };
  },
};
