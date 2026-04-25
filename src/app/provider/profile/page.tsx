import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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
    <>
      <header className="mb-6 flex items-start justify-between">
        <h1 className="text-2xl font-bold">청명 프로필 편집</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            로그아웃
          </button>
        </form>
      </header>

      <section className="mb-6 flex items-center justify-between rounded-[20px] border border-blue-100 bg-[#F0F4FF] px-5 py-4 dark:border-blue-900/50 dark:bg-blue-950/30">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-zinc-900 dark:text-zinc-50">
            🎉 {provider.companyName}
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
            프로필을 완성해 첫 견적을 받아보세요
          </p>
        </div>
        <Link
          href={`/providers/${providerId}`}
          className="shrink-0 text-[13px] font-bold text-[#2B66F6] hover:underline dark:text-[#5B8DF6]"
        >
          공개 프로필 →
        </Link>
      </section>

      <ProfileEditorTabs currentTab={currentTab} />

      {currentTab === "basic" && <BasicInfoTab provider={provider} />}
      {currentTab === "price" && <PriceBookTab provider={provider} />}
      {currentTab === "portfolio" && <PortfolioTab workCases={workCases} />}
      {currentTab === "promo" && <PromoTab provider={provider} />}

      <div className="mt-12 flex justify-center gap-3">
        <Link
          href="/provider/requests"
          className="flex-1 text-center rounded-[16px] bg-zinc-900 px-4 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          받은 요청 보기 →
        </Link>
        <Link
          href="/"
          className="flex-1 text-center rounded-[16px] border border-zinc-200 bg-white px-4 py-3.5 text-[15px] font-bold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          홈으로
        </Link>
      </div>
    </>
  );
}
