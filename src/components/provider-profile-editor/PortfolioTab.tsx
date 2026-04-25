"use client";

import { WorkCaseUploadForm } from "./WorkCaseUploadForm";
import { WorkCaseCard } from "./WorkCaseCard";
import type { WorkCase } from "@/types/work-case";

interface Props {
  workCases: WorkCase[];
}

export function PortfolioTab({ workCases }: Props) {
  return (
    <div className="space-y-6">
      <WorkCaseUploadForm />

      <section>
        <h3 className="mb-3 text-sm font-semibold">
          업로드된 작업{" "}
          <span className="text-xs text-zinc-500">({workCases.length})</span>
        </h3>
        {workCases.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            아직 작업이 없어요. 첫 작업을 업로드해 고객에게 실력을 보여주세요.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {workCases.map((wc) => (
              <WorkCaseCard key={wc.id} workCase={wc} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
