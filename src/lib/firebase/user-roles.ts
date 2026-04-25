import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type { UserRole } from "@/types/page";

/**
 * Idempotent role append using arrayUnion. `roles`가 없으면 배열로 생성되고,
 * 이미 존재하는 role은 무시된다. users 도큐먼트는 이미 존재한다고 가정
 * (auth signup 플로우에서 생성됨) — merge:true 로 타 필드는 보존.
 */
export async function ensureUserRole(
  uid: string,
  role: UserRole,
): Promise<void> {
  await adminDb
    .collection("users")
    .doc(uid)
    .set({ roles: FieldValue.arrayUnion(role) }, { merge: true });
}

export async function ensureClientRole(uid: string): Promise<void> {
  await ensureUserRole(uid, "client");
}
