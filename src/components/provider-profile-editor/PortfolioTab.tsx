"use client";

import { WorkCaseUploadForm } from "./WorkCaseUploadForm";
import { WorkCaseCard } from "./WorkCaseCard";
import type { WorkCase } from "@/types/work-case";

interface Props {
  workCases: WorkCase[];
}

import { Image as ImageIcon, CheckCircle2 } from "lucide-react";

export function PortfolioTab({ workCases }: Props) {
  return (
    <div className="space-y-10">
      <WorkCaseUploadForm />

      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#6B7280]">
            <ImageIcon className="h-4 w-4" />
            <span>작업 포트폴리오</span>
          </div>
          <span className="text-[12px] font-bold text-[#9CA3AF]">
            총 {workCases.length}개
          </span>
        </div>

        {workCases.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#E5E7EB] p-12 text-center transition-all hover:bg-[#F9FAFB]">
            <p className="text-[14px] font-medium text-[#9CA3AF]">
              아직 등록된 작업이 없어요.<br />
              첫 작업을 업로드해 실력을 보여주세요.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {workCases.map((wc) => (
              <WorkCaseCard key={wc.id} workCase={wc} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
