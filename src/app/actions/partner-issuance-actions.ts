"use server";

import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { userRepository } from "@/lib/firebase/user-repository";
import { partnerRepository } from "@/lib/firebase/partner-repository";
import { partnerApplicantRepository } from "@/lib/firebase/partner-applicant-repository";
import {
  encodeCursor,
  type ClientWithIssuanceStatus,
  type ListClientsPageInput,
  type ListClientsPageResult,
} from "@/types/admin-issuance";
import type { PartnerApplicant } from "@/types/partner-applicant";

/**
 * v1.10 partner-issue-from-users · §4 — admin 발급 콘솔용 server actions.
 *
 *  - listClientsPage: client roles 회원 1페이지 + 발급/신청 상태 머지
 *  - listPendingApplicantsForIssuance: pending 신청자 (cycle #21 listPending wrapper)
 *
 * R3: server action 1회당 partners·applicants 각 1번씩 fetch (in-memory join, request-scope 캐시 없음).
 * R5: dateRange 활성 시 sort='latest' 강제 (zod superRefine).
 * H8: H6 cursor zod schema → min(1).nullable().
 */

const dateRangeSchema = z
  .object({
    fromYmd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    toYmd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((d) => d.fromYmd <= d.toYmd, {
    message: "fromYmd > toYmd",
  });

const listClientsPageSchema = z
  .object({
    cursor: z.string().min(1).nullable(),
    sort: z.enum(["latest", "name"]),
    dateRange: dateRangeSchema.nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.dateRange && v.sort !== "latest") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sort"],
        message: "dateRange 활성 시 sort='latest' 강제 (R5)",
      });
    }
  });

const PAGE_SIZE = 20;

export async function listClientsPage(
  input: ListClientsPageInput,
): Promise<ListClientsPageResult> {
  // C1 fix: requireAdminApi(): Promise<void>
  await requireAdminApi();
  const parsed = listClientsPageSchema.parse(input);

  // 1) 회원 페이지 (limit 21 — hasMore 판별용)
  const usersPage = await userRepository.listClientsPage({
    cursor: parsed.cursor,
    sort: parsed.sort,
    dateRange: parsed.dateRange,
    pageSize: PAGE_SIZE + 1,
  });

  // 2) 병렬: partners 전체 + applicants pending (R3)
  const [partners, applicants] = await Promise.all([
    partnerRepository.listAll(200),
    partnerApplicantRepository.listPending(100),
  ]);

  // 3) uid → 상태 map
  const partnerMap = new Map<string, string>(
    partners.map((p) => [p.ownerUid, p.id]),
  );
  const applicantMap = new Map<
    string,
    PartnerApplicant["status"]
  >(applicants.map((a) => [a.ownerUid, a.status]));

  // 4) hasMore + 머지
  const hasMore = usersPage.docs.length > PAGE_SIZE;
  const sliced = usersPage.docs.slice(0, PAGE_SIZE);
  const items: ClientWithIssuanceStatus[] = sliced.map((u) => ({
    user: u,
    partnerId: partnerMap.get(u.uid) ?? null,
    applicantStatus: applicantMap.get(u.uid) ?? null,
  }));

  // 5) nextCursor — last visible item 기준
  const nextCursor =
    hasMore && items.length > 0
      ? encodeCursor(parsed.sort, items[items.length - 1].user)
      : null;

  return { items, nextCursor, hasMore };
}

export async function listPendingApplicantsForIssuance(): Promise<
  PartnerApplicant[]
> {
  await requireAdminApi();
  return partnerApplicantRepository.listPending(100);
}
