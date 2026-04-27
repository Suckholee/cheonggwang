import { Settings, Construction } from "lucide-react";

export const metadata = {
  title: "설정 · 청광",
};

export default function ProviderSettingsPage() {
  return (
    <main className="min-h-screen bg-[#F9FAFB] pb-20 pt-6 px-4">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-[#2563EB] p-3 text-white shadow-lg shadow-blue-500/20">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#111827]">환경 설정</h1>
            <p className="text-[14px] font-bold text-[#6B7280]">계정 및 서비스 운영 설정</p>
          </div>
        </header>

        <div className="chg-card p-12 text-center flex flex-col items-center justify-center gap-6">
          <div className="rounded-full bg-[#EFF6FF] p-6 text-[#2563EB]">
            <Construction className="h-12 w-12 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-[#111827]">기능 준비 중</h2>
            <p className="text-[15px] font-medium leading-relaxed text-[#4B5563]">
              알림 설정, 정산 계좌 관리, 그리고 보안 옵션이<br />
              현재 개발 중입니다. v1.1 업데이트에서 만나보실 수 있습니다.
            </p>
          </div>
          <div className="mt-4 rounded-full bg-[#F3F4F6] px-4 py-1.5 text-[12px] font-bold text-[#6B7280]">
            COMING SOON · v1.1c
          </div>
        </div>
      </div>
    </main>
  );
}
