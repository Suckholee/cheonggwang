import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ExternalLink, LogOut, LayoutGrid, CheckCircle2 } from "lucide-react";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { userRepository } from "@/lib/firebase/user-repository";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { workCaseRepository } from "@/lib/firebase/work-case-repository";
import { signOut } from "@/app/actions/auth-actions";
import {
  ProfileEditorTabs,
  type EditorTabKey,
} from "@/components/provider-profile-editor/ProfileEditorTabs";
import { BasicInfoTab } from "@/components/provider-profile-editor/BasicInfoTab";
import { PriceBookTab } from "@/components/provider-profile-editor/PriceBookTab";
import { PortfolioTab } from "@/components/provider-profile-editor/PortfolioTab";
import { PromoTab } from "@/components/provider-profile-editor/PromoTab";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "청명 프로필 편집 · 청광",
};

const VALID_TABS = ["basic", "price", "portfolio", "promo"] as const satisfies readonly EditorTabKey[];

function parseTab(raw: string | undefined): EditorTabKey {
  return (VALID_TABS as readonly string[]).includes(raw ?? "")
    ? (raw as EditorTabKey)
    : "basic";
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default function ProviderProfilePage(props: PageProps) {
  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_18%,#ffffff_100%)] px-5 pt-3 pb-32 dark:bg-none">
      <header className="sticky top-0 z-40 -mx-5 mb-5 border-b border-white/70 bg-[#f4f9ff]/90 px-5 py-3 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/90">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Link
              href="/provider/home"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 border border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-sm transition-all hover:scale-105 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-450"
              aria-label="청명 홈으로 가기"
            >
              <ChevronLeft className="h-4.5 w-4.5" strokeWidth={2.5} />
            </Link>
            <BrandLogo />
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#d8e6ff] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/80 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              Profile
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-xl border border-zinc-200 bg-white/85 px-3 py-1.5 text-xs font-bold text-zinc-650 transition-all hover:bg-white hover:text-zinc-950 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-450 dark:hover:text-zinc-200"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
        <div className="mt-4 rounded-[28px] border border-[#dbe8fb] bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_46%,#dcebff_100%)] px-5 py-5 shadow-[0_14px_34px_rgba(43,102,246,0.08)] dark:border-zinc-850 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-950">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/70 dark:text-zinc-400">
            Partner Profile
          </p>
          <h1 className="mt-1 text-[26px] font-black tracking-tight text-zinc-950 dark:text-zinc-50">
            청명 프로필
          </h1>
          <p className="mt-2 text-[13px] leading-5 text-zinc-650 dark:text-zinc-400">
            매력적인 프로필 정보를 등록하여 우리 동네 고객에게 신뢰를 전달해보세요.
          </p>
        </div>
      </header>

      <Suspense fallback={<EditorSkeleton />}>
        <EditorBody searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-28 w-full rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
      <div className="h-64 w-full rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
    </div>
  );
}

async function EditorBody({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const jar = await cookies();
  let uid: string;
  try {
    uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    redirect(`/login?next=${encodeURIComponent("/provider/profile")}`);
  }

  const user = await userRepository.get(uid);
  const providerId = user?.providerId;
  if (!providerId) {
    redirect("/signup-provider");
  }

  const provider = await providerRepository.get(providerId);
  if (!provider) {
    redirect("/signup-provider");
  }

  const { tab: tabParam } = await searchParams;
  const currentTab = parseTab(tabParam);

  const workCases =
    currentTab === "portfolio"
      ? await workCaseRepository.listByProvider(providerId, 24)
      : [];

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] p-5 shadow-lg shadow-blue-500/20 text-white dark:from-[#3B82F6] dark:to-[#1D4ED8] dark:shadow-none">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-200" />
            <p className="text-[15px] font-bold tracking-tight">
              {provider.companyName}
            </p>
          </div>
          <p className="text-[12px] font-medium text-blue-100/80">
            프로필 완성도가 높을수록 신뢰도가 올라갑니다
          </p>
        </div>
        <Link
          href={`/providers/${providerId}`}
          target="_blank"
          className="flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-[13px] font-bold backdrop-blur-md transition-all hover:bg-white/30 active:scale-[0.98]"
        >
          <span>내 프로필 보기</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </section>

      <div className="chg-card p-5 bg-white border border-zinc-200/50 rounded-[24px] shadow-sm dark:bg-zinc-950 dark:border-zinc-850">
        <ProfileEditorTabs currentTab={currentTab} />

        <div className="mt-6">
          {currentTab === "basic" && <BasicInfoTab provider={provider} />}
          {currentTab === "price" && <PriceBookTab provider={provider} />}
          {currentTab === "portfolio" && <PortfolioTab workCases={workCases} />}
          {currentTab === "promo" && <PromoTab provider={provider} />}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/provider/requests"
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 border-b-4 border-b-black py-4 text-[15px] font-extrabold text-white transition-all hover:bg-zinc-850 active:scale-[0.98] active:translate-y-[2px] shadow-sm dark:bg-zinc-100 dark:border-b-zinc-300 dark:text-zinc-950 dark:hover:bg-white"
        >
          <LayoutGrid className="h-5 w-5" />
          <span>전체 요청 확인하기</span>
        </Link>
        <Link
          href="/provider/home"
          className="flex-1 flex items-center justify-center rounded-2xl border border-zinc-200 border-b-4 border-b-zinc-300 bg-white py-4 text-[15px] font-extrabold text-zinc-700 transition-all hover:border-zinc-350 hover:scale-[1.01] active:scale-[0.98] active:translate-y-[2px] shadow-sm dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:border-b-zinc-950"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
