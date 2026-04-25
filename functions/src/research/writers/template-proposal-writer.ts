import { createPatch } from "diff";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { Category } from "../types/shared";
import { CURRENT_RENDER_ORDER, SECTION_TYPES, type SectionType } from "../types/shared";
import type { CategoryInsight } from "../types/insight";
import type { SectionDefinition, TemplateProposal } from "../types/proposal";

const REQUIRED_SECTIONS: ReadonlySet<SectionType> = new Set([
  "hero",
  "intro",
  "cta",
]);

/**
 * 분석 결과에서 섹션 구조 제안을 생성한다.
 * - Gemini 결과의 commonOrder를 SectionType enum 내로 필터링
 * - 빈 결과면 CURRENT_RENDER_ORDER를 그대로 반환 (변화 없음)
 * - hero/intro/cta는 required로 고정
 */
export function buildProposedStructure(
  insight: CategoryInsight
): SectionDefinition[] {
  const order = insight.sectionStructure.commonOrder.filter(
    (s): s is SectionType => (SECTION_TYPES as readonly string[]).includes(s)
  );
  const finalOrder = order.length > 0 ? order : [...CURRENT_RENDER_ORDER];

  return finalOrder.map((type, i) => ({
    type,
    order: i,
    required: REQUIRED_SECTIONS.has(type),
  }));
}

export function buildDiff(
  category: Category,
  currentOrder: readonly SectionType[],
  proposed: SectionDefinition[]
): string {
  const current = JSON.stringify(currentOrder, null, 2);
  const next = JSON.stringify(
    proposed.map((s) => s.type),
    null,
    2
  );
  return createPatch(
    `templates/${category}.renderOrder`,
    current,
    next,
    "current",
    "proposed"
  );
}

export async function writeTemplateProposal(
  db: Firestore,
  category: Category,
  weekKey: string,
  insight: CategoryInsight
): Promise<TemplateProposal> {
  const proposedStructure = buildProposedStructure(insight);
  const diff = buildDiff(category, CURRENT_RENDER_ORDER, proposedStructure);

  const doc: TemplateProposal = {
    proposedStructure,
    diff,
    status: "pending",
  };

  await db
    .doc(`templates/${category}/proposals/${weekKey}`)
    .set({
      ...doc,
      createdAt: FieldValue.serverTimestamp(),
    });

  return doc;
}
