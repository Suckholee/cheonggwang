"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ClientUsersPanel from "./ClientUsersPanel";
import PendingApplicantsPanel from "./PendingApplicantsPanel";
import IssueModal from "./IssueModal";
import PartnerIssueForm from "./PartnerIssueForm";
import type { UserProfile } from "@/types/page";
import type { PartnerApplicant } from "@/types/partner-applicant";

/**
 * v1.10 partner-issue-from-users · §6.1·§7 — 3-탭 발급 콘솔.
 * 탭: [전체 명단] [신청자 명단] [이메일 검색]
 * R6: 발급 성공 시 router.refresh() + setReloadTick — server data + client cache 양쪽 갱신
 */

type Tab = "clients" | "applicants" | "fallback";

type ModalState =
  | null
  | { kind: "fresh"; user: UserProfile }
  | { kind: "approve"; applicant: PartnerApplicant };

export default function IssuanceConsole() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("clients");
  const [modal, setModal] = useState<ModalState>(null);
  const [reloadTick, setReloadTick] = useState(0);

  function handleSuccess() {
    setModal(null);
    router.refresh();
    setReloadTick((n) => n + 1);
  }

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="발급 콘솔 탭"
        className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800"
      >
        <TabBtn
          active={activeTab === "clients"}
          onClick={() => setActiveTab("clients")}
        >
          전체 명단
        </TabBtn>
        <TabBtn
          active={activeTab === "applicants"}
          onClick={() => setActiveTab("applicants")}
        >
          신청자 명단
        </TabBtn>
        <TabBtn
          active={activeTab === "fallback"}
          onClick={() => setActiveTab("fallback")}
        >
          이메일 검색
        </TabBtn>
      </div>

      <div role="tabpanel">
        {activeTab === "clients" ? (
          <ClientUsersPanel
            reloadTick={reloadTick}
            onSelect={(user) => setModal({ kind: "fresh", user })}
          />
        ) : activeTab === "applicants" ? (
          <PendingApplicantsPanel
            reloadTick={reloadTick}
            onSelect={(applicant) => setModal({ kind: "approve", applicant })}
          />
        ) : (
          <FallbackTab />
        )}
      </div>

      {modal ? (
        modal.kind === "fresh" ? (
          <IssueModal
            kind="fresh"
            user={modal.user}
            onClose={() => setModal(null)}
            onSuccess={handleSuccess}
          />
        ) : (
          <IssueModal
            kind="approve"
            applicant={modal.applicant}
            onClose={() => setModal(null)}
            onSuccess={handleSuccess}
          />
        )
      ) : null}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-t-md px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-b-2 border-blue-600 text-blue-700 dark:text-blue-300"
          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function FallbackTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        명단에 없는 사용자에게 발급할 때 사용합니다. Firebase Auth에는 있지만
        Firestore <code>users</code> 컬렉션에 없는 레거시 가입자, 또는 직접 만든
        Auth 계정에 발급할 수 있습니다.
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <PartnerIssueForm />
      </div>
    </div>
  );
}
