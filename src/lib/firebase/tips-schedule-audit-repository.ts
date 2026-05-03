import "server-only";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type {
  TipsScheduleAuditEvent,
  TipsScheduleConfig,
} from "@/lib/tips/tips-config";

/**
 * v1.19 cycle #32 tips-schedule-editor · §3.7 (S15 — NEW).
 *
 * `tipsScheduleAudit` collection access (Admin SDK only — firestore.rules `if false`).
 * Next.js 단독 (functions runner는 audit 미사용 — R-M4).
 *
 * C1·M2 결의 재사용 — 단일 admin literal "admin".
 * C4 결의 재사용 — Timestamp → Date 변환.
 * H2 결의 재사용 — `at DESC` 단일 필드 인덱스 자동 생성, firestore.indexes.json 추가 X.
 *
 * OQ13 결의 — root collection (system 하위 X). tipsHistory 동등 패턴.
 */

const AUDIT = () => adminDb.collection("tipsScheduleAudit");

export const tipsScheduleAuditRepository = {
  /**
   * Schedule 변경 audit 기록.
   * before=null: 첫 변경 시 (M6 결의 — fallback 검출 시점).
   */
  async record(
    before: TipsScheduleConfig | null,
    after: TipsScheduleConfig,
  ): Promise<void> {
    await AUDIT().add({
      kind: "schedule-update",
      before: before ? { ...before } : null,
      after: { ...after },
      by: "admin",
      at: FieldValue.serverTimestamp(),
    });
  },

  /**
   * 최근 audit 이벤트 list (default 20). UI는 최신순.
   */
  async list(limit = 20): Promise<TipsScheduleAuditEvent[]> {
    const snap = await AUDIT().orderBy("at", "desc").limit(limit).get();
    return snap.docs.map((s) => {
      const d = s.data();
      return {
        id: s.id,
        at: (d.at as Timestamp)?.toDate?.() ?? new Date(0),
        kind: "schedule-update",
        before: (d.before as TipsScheduleConfig | null) ?? null,
        after: d.after as TipsScheduleConfig,
        by: "admin",
      };
    });
  },
};
