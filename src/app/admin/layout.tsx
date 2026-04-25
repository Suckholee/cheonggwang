import { Suspense } from "react";
import { connection } from "next/server";
import AdminNav from "@/components/admin/AdminNav";
import AdminBottomBar from "@/components/admin/AdminBottomBar";
import { partnerApplicantRepository } from "@/lib/firebase/partner-applicant-repository";
import type { ReactNode } from "react";

/**
 * v1.8 admin-console · §1.1 — /admin/* 공통 레이아웃.
 *
 * /admin/login은 이 layout을 거치지만, login은 비인증자 접근이 정상 흐름이므로
 * 가드 분기가 필요. 이를 위해 layout는 path 비의존적으로 가드를 거는 게 아니라,
 * AdminGuard 자식에서 처리. login page 자체는 /admin/login에 있고, 이 page는
 * SmartGuard로 감싸지 않음 (page 자체에서 자체 처리).
 *
 * 결정: layout이 모든 /admin/* (login 포함)을 보호하면 login 자체가 불가.
 * 따라서 login은 /admin/login route group 분리하지 않고, layout에서
 * pathname 검사로 우회 — 다만 layout는 pathname 모르므로 AdminGuard를
 * 하나 따로 두고 page에서 호출. 가장 단순한 길은:
 *   - layout: AdminNav만 렌더 (가드 X)
 *   - 각 보호 페이지: 자체적으로 requireAdminPage 호출
 *   - /admin/login: 가드 없음 (layout에 nav만 노출)
 *
 * 단점: AdminNav는 비인증자에게도 잠시 보이지만, 메뉴 클릭하면 다시 redirect.
 * 또는 AdminNav를 인증된 사용자에게만 보이도록 분기 (isAdminAuthenticated).
 */
export const metadata = {
  title: "운영 콘솔 · 청광",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div data-admin-shell className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Suspense fallback={null}>
        <AdminNavSlot />
      </Suspense>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-[calc(var(--bottom-nav-height)+24px)] md:pb-6">
        {children}
      </main>
      <Suspense fallback={null}>
        <AdminBottomBarSlot />
      </Suspense>
    </div>
  );
}

/** 인증된 사용자에게만 nav 표시 (login 페이지 등에선 자동 hidden). */
async function AdminNavSlot() {
  await connection();
  const { isAdminAuthenticated } = await import("@/lib/auth/require-admin");
  const ok = await isAdminAuthenticated();
  if (!ok) return null;
  return <AdminNav />;
}

/** 인증된 사용자에게만 하단 액션 바 표시 (대기 신청 카운트 동시 fetch). */
async function AdminBottomBarSlot() {
  await connection();
  const { isAdminAuthenticated } = await import("@/lib/auth/require-admin");
  const ok = await isAdminAuthenticated();
  if (!ok) return null;
  const pendingApplicantsCount =
    await partnerApplicantRepository.pendingCount();
  return <AdminBottomBar pendingApplicantsCount={pendingApplicantsCount} />;
}
