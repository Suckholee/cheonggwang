"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PARTNER_INDUSTRY_LABELS } from "@/domain/partner-industry";
import {
  CONTENT_TEMPLATE_TYPE_LABELS,
  type ContentTemplate,
} from "@/types/content-template";
import { ContentTemplateEditor } from "./ContentTemplateEditor";

export default function ContentTemplateList({
  items,
}: {
  items: ContentTemplate[];
}) {
  const [editorOpen, setEditorOpen] = useState<
    null | { mode: "new" } | { mode: "edit"; template: ContentTemplate }
  >(null);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-zinc-500">총 {items.length}건</p>
        <button
          onClick={() => setEditorOpen({ mode: "new" })}
          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-3 w-3" />
          새 템플릿
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          등록된 템플릿이 없습니다. [새 템플릿]으로 첫 항목을 등록하세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setEditorOpen({ mode: "edit", template: tpl })}
              className="rounded-lg border border-zinc-200 bg-white p-4 text-left transition hover:border-blue-400 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700 dark:hover:bg-blue-950"
            >
              <p className="truncate text-sm font-semibold">{tpl.title}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {CONTENT_TEMPLATE_TYPE_LABELS[tpl.type]} ·{" "}
                {PARTNER_INDUSTRY_LABELS[tpl.industry]}
              </p>
              {tpl.tags.length > 0 ? (
                <p className="mt-1 truncate text-[11px] text-zinc-400">
                  {tpl.tags.join(" · ")}
                </p>
              ) : null}
              <p className="mt-2 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                {tpl.body}
              </p>
            </button>
          ))}
        </div>
      )}

      {editorOpen ? (
        <ContentTemplateEditor
          initial={
            editorOpen.mode === "edit" ? editorOpen.template : undefined
          }
          onClose={() => setEditorOpen(null)}
        />
      ) : null}
    </>
  );
}
