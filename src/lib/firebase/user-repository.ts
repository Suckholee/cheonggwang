import "server-only";
import { cache } from "react";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type { UserProfile, UserRole } from "@/types/page";
import {
  decodeCursor,
  type ClientDateRange,
  type ClientSortMode,
} from "@/types/admin-issuance";

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

function toUserProfile(id: string, d: DocumentData): UserProfile {
  const rolesRaw = Array.isArray(d.roles) ? (d.roles as unknown[]) : [];
  const roles: UserRole[] = rolesRaw.filter(
    (r): r is UserRole => r === "client" || r === "provider",
  );
  return {
    uid: id,
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

  /**
   * v1.10 partner-issue-from-users · §5 — client roles 회원 1페이지 조회 (cursor).
   *  - sort='latest': createdAt desc + __name__ desc
   *  - sort='name':   displayName asc + __name__ asc
   *  - dateRange: 활성 시 sort='latest' 강제 (server action에서 보장, R5)
   *  - pageSize = 21 (hasMore 판별용 1건 더, server action에서 slice)
   *  - H4: dateRange는 +09:00 ISO로 Timestamp 변환 (Asia/Seoul 단일 TZ)
   */
  async listClientsPage(input: {
    cursor: string | null;
    sort: ClientSortMode;
    dateRange: ClientDateRange | null;
    pageSize: number;
  }): Promise<{ docs: UserProfile[] }> {
    let q: FirebaseFirestore.Query<DocumentData> = adminDb
      .collection("users")
      .where("roles", "array-contains", "client");

    if (input.dateRange) {
      const fromTs = Timestamp.fromDate(
        new Date(`${input.dateRange.fromYmd}T00:00:00+09:00`),
      );
      const toTs = Timestamp.fromDate(
        new Date(`${input.dateRange.toYmd}T23:59:59.999+09:00`),
      );
      q = q.where("createdAt", ">=", fromTs).where("createdAt", "<=", toTs);
    }

    if (input.sort === "latest") {
      q = q.orderBy("createdAt", "desc").orderBy("__name__", "desc");
    } else {
      q = q.orderBy("displayName", "asc").orderBy("__name__", "asc");
    }

    const decoded = decodeCursor(input.sort, input.cursor);
    if (decoded) {
      const primary =
        input.sort === "latest"
          ? Timestamp.fromMillis(decoded.primary as number)
          : (decoded.primary as string);
      q = q.startAfter(primary, decoded.uid);
    }

    q = q.limit(input.pageSize);

    const snap = await q.get();
    return {
      docs: snap.docs.map((d) => toUserProfile(d.id, d.data())),
    };
  },
};
