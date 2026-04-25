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
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">자동발행 설정</h1>
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
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
