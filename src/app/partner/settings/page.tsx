import { Suspense } from "react";
import { connection } from "next/server";
import { requirePartnerPage } from "@/lib/auth/require-partner";
import AutoPublishSettings from "@/components/partner/AutoPublishSettings";

export const metadata = { title: "설정 · 청광 파트너" };

/**
 * Next 16 cacheComponents 패턴 (community-feed-3panel R10):
 *  - Page는 sync, Suspense로 데이터 fetch 자식을 감쌈
 *  - 자식 async 컴포넌트에서 connection() + uncached IO
 */
export default function PartnerSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pb-20">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">자동발행 설정</h1>
        <p className="text-base text-[#6B7280]">
          청광 AI가 초고를 자동으로 발행할 시간대와 요일을 설정할 수 있습니다.
        </p>
      </header>

      <div className="chg-card">
        <Suspense fallback={<SettingsSkeleton />}>
          <SettingsBody />
        </Suspense>
      </div>
    </div>
  );
}

async function SettingsBody() {
  await connection();
  const { partner } = await requirePartnerPage("/partner/settings");
  return <AutoPublishSettings initial={partner.autoPublish} />;
}

function SettingsSkeleton() {
  return (
    <div
      className="h-64 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800"
      aria-label="불러오는 중"
    />
  );
}
