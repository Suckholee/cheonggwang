export const metadata = {
  title: "설정 · 청광",
};

export default function ProviderSettingsPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-xl flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="text-5xl" aria-hidden>
        ⚙️
      </span>
      <h1 className="text-xl font-bold">설정</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        알림·정산 계좌·프로필 편집 기능이 곧 추가됩니다 (v1.1c).
      </p>
    </div>
  );
}
