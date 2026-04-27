import { Suspense } from "react";
import { connection } from "next/server";
import { requirePartnerPage } from "@/lib/auth/require-partner";
import { isInAutoPublishWindow } from "@/lib/partner/auto-publish-window";
import PartnerPostsNewWizard from "@/components/partner/PartnerPostsNewWizard";

export const metadata = { title: "새 초고 · 청광 파트너" };

/**
 * v1.12 cycle #25 partner-content-formats — 3-step Wizard 진입점.
 * Step 1 형식 선택 → Step 2 템플릿 추천 → Step 3 PartnerPromoDraftForm.
 */
export default function NewPartnerPostPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">새 초고 만들기</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          형식과 템플릿을 골라 사진·키워드를 올리면 AI가 매장에 맞춘 초안을 생성합니다.
        </p>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <Suspense fallback={<FormSkeleton />}>
          <WizardBody />
        </Suspense>
      </div>
    </div>
  );
}

async function WizardBody() {
  await connection();
  const { partner } = await requirePartnerPage("/partner/posts/new");
  const inWindow = isInAutoPublishWindow(partner.autoPublish);
  const industry = partner.profile?.industry ?? null;
  return (
    <PartnerPostsNewWizard
      industry={industry}
      inAutoPublishWindow={inWindow}
    />
  );
}

function FormSkeleton() {
  return (
    <div
      className="h-96 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800"
      aria-label="불러오는 중"
    />
  );
}
