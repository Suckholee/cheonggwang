import type { ContentTemplate } from "@/types/content-template";

/**
 * v1.12 cycle #25 partner-content-formats · §3.4.
 *
 * 선택된 admin contentTemplate을 LLM 프롬프트용 RAG context section으로 직렬화.
 * `getRagContext`(cycle #24) 결과 다음에 결합되어 프롬프트에 주입됨.
 */
export function buildTemplateContextSection(
  template: ContentTemplate | null,
): string {
  if (!template) return "";
  return [
    "[참조 템플릿 — admin 큐레이션]",
    `type: ${template.type}`,
    `title: ${template.title}`,
    `tags: ${template.tags.join(", ")}`,
    `scenarios: ${template.scenarios.join(" / ")}`,
    "---",
    template.body,
  ].join("\n");
}
