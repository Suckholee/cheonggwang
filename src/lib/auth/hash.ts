import "server-only";
import { createHash } from "node:crypto";

/**
 * v1.11 partner-rag-system · M4 — reporter uid를 ragHistory에 노출하지 않기 위한
 * 단방향 해시 (SHA-256). 원본 uid는 admin-only `reports/{reportId}` collection에만 저장.
 */
export function hashUid(uid: string): string {
  return createHash("sha256").update(uid, "utf8").digest("hex").slice(0, 16);
}
