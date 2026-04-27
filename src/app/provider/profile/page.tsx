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
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8 pb-24">
      <Suspense fallback={<EditorSkeleton />}>
        <EditorBody searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 h-8 w-64 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mb-8 h-4 w-80 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-64 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
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
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-[#111827]">청명 프로필</h1>
          <p className="text-[14px] font-medium text-[#6B7280]">매력적인 프로필로 더 많은 고객을 만나보세요</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </form>
      </header>

      <section className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] p-5 shadow-lg shadow-blue-500/20 text-white">
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

      <div className="chg-card">
        <ProfileEditorTabs currentTab={currentTab} />

        <div className="mt-6">
          {currentTab === "basic" && <BasicInfoTab provider={provider} />}
          {currentTab === "price" && <PriceBookTab provider={provider} />}
          {currentTab === "portfolio" && <PortfolioTab workCases={workCases} />}
          {currentTab === "promo" && <PromoTab provider={provider} />}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/provider/requests"
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#111827] py-4 text-[15px] font-bold text-white transition-all hover:bg-[#1F2937] shadow-xl shadow-zinc-900/10 active:scale-[0.98]"
        >
          <LayoutGrid className="h-5 w-5" />
          <span>전체 요청 확인하기</span>
        </Link>
        <Link
          href="/"
          className="flex-1 flex items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white py-4 text-[15px] font-bold text-[#374151] transition-all hover:bg-[#F9FAFB] active:scale-[0.98]"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
