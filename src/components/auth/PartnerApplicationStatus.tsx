"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  limit,
  type DocumentData,
} from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { clientDb, clientAuth } from "@/lib/firebase/client";
import type {
  PartnerApplicant,
  PartnerApplicantStatus,
} from "@/types/partner-applicant";

/**
 * v1.9 partner-application · §6.2 — 신청 진행 상태 (onSnapshot 실시간).
 *
 * 4가지 상태:
 *  - loading        : 인증 확인 중 / 첫 onSnapshot 결과 대기
 *  - no-application : 로그인됐지만 신청 doc 없음 (직접 URL 진입, M1 결의)
 *  - pending        : 검토 중
 *  - approved       : 승인 완료 → /partner/posts 자동 이동 (5초 후, OQ-2 hybrid)
 *  - rejected       : 거절 + 재신청 옵션
 */

type ViewState =
  | { kind: "loading" }
  | { kind: "no-session" }
  | { kind: "no-application" }
  | { kind: "applied"; applicant: PartnerApplicantClient };

interface PartnerApplicantClient {
  id: string;
  status: PartnerApplicantStatus;
  businessName: string;
  rejectReason: string | null;
}

function toClientShape(id: string, d: DocumentData): PartnerApplicantClient {
  return {
    id,
    status:
      d.status === "approved" || d.status === "rejected"
        ? d.status
        : "pending",
    businessName: String(d.businessName ?? ""),
    rejectReason: (d.rejectReason as string | null | undefined) ?? null,
  };
}

export default function PartnerApplicationStatus() {
  const router = useRouter();
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [user, setUser] = useState<User | null>(null);
  const [autoRedirectIn, setAutoRedirectIn] = useState<number | null>(null);

  // 1. Firebase Auth user 감지
  useEffect(() => {
    const unsub = onAuthStateChanged(clientAuth, (u) => {
      setUser(u);
      if (!u) setView({ kind: "no-session" });
    });
    return () => unsub();
  }, []);

  // 2. applicant onSnapshot
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(clientDb, "partnerApplicants"),
      where("ownerUid", "==", user.uid),
      limit(1),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setView({ kind: "no-application" });
          return;
        }
        const doc = snap.docs[0];
        setView({
          kind: "applied",
          applicant: toClientShape(doc.id, doc.data()),
        });
      },
      (err) => {
        console.warn("[PartnerApplicationStatus] onSnapshot error", err);
        setView({ kind: "no-application" });
      },
    );
    return () => unsub();
  }, [user]);

  // 3. approved → 5초 자동 redirect (OQ-2)
  useEffect(() => {
    if (view.kind !== "applied" || view.applicant.status !== "approved") {
      setAutoRedirectIn(null);
      return;
    }
    setAutoRedirectIn(5);
    const interval = setInterval(() => {
      setAutoRedirectIn((n) => (n === null ? null : n - 1));
    }, 1000);
    const timeout = setTimeout(() => {
      router.push("/partner/posts");
    }, 5000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [view, router]);

  if (view.kind === "loading") {
    return (
      <div
        className="h-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
        aria-label="불러오는 중"
      />
    );
  }

  if (view.kind === "no-session") {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-center dark:border-amber-700 dark:bg-amber-950">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          로그인이 필요합니다.
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <Link
            href="/signup-partner"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white"
          >
            의뢰업체 등록 신청
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            로그인
          </Link>
        </div>
      </div>
    );
  }

  if (view.kind === "no-application") {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-2xl">ⓘ</p>
        <p className="mt-2 text-sm font-medium">진행 중인 신청이 없습니다</p>
        <p className="mt-1 text-xs text-zinc-500">
          청광 의뢰업체로 등록하려면 신청을 먼저 제출해 주세요.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link
            href="/signup-partner"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white"
          >
            의뢰업체 등록 신청 →
          </Link>
          <Link
            href="/"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  const { applicant } = view;

  if (applicant.status === "pending") {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-3xl">🕒</p>
        <p className="mt-2 text-base font-semibold">검토 중입니다</p>
        <p className="mt-1 text-xs text-zinc-500">
          매장명: <strong>{applicant.businessName}</strong>
        </p>
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          영업일 1-2일 내 결과 안내. 페이지를 닫아도 괜찮습니다 — 다시 방문하면
          상태가 표시됩니다.
        </p>
      </div>
    );
  }

  if (applicant.status === "approved") {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-center dark:border-emerald-700 dark:bg-emerald-950">
        <p className="text-4xl">🎉</p>
        <p className="mt-2 text-base font-bold text-emerald-800 dark:text-emerald-200">
          승인되었습니다!
        </p>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
          매장명: <strong>{applicant.businessName}</strong>
        </p>
        {autoRedirectIn !== null && autoRedirectIn > 0 ? (
          <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">
            {autoRedirectIn}초 후 작성 페이지로 자동 이동…
          </p>
        ) : null}
        <Link
          href="/partner/posts"
          className="mt-3 inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          지금 이동 →
        </Link>
      </div>
    );
  }

  // rejected
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
      <p className="text-3xl">❌</p>
      <p className="mt-2 text-base font-semibold text-red-800 dark:text-red-200">
        거절되었습니다
      </p>
      {applicant.rejectReason ? (
        <p className="mt-3 rounded-md bg-white px-3 py-2 text-left text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          <span className="text-xs text-zinc-500">사유:</span>
          <br />
          {applicant.rejectReason}
        </p>
      ) : null}
      <div className="mt-4 flex justify-center gap-2">
        <Link
          href="/signup-partner"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white"
        >
          재신청하기
        </Link>
        <Link
          href="/"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
