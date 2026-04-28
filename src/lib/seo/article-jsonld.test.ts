/**
 * v1.15 cycle #28 partner-aeo-boost · Test Plan §9.1 — article-jsonld 통합 테스트.
 *
 * 실행: `npx tsx src/lib/seo/article-jsonld.test.ts`
 *
 * 5 cases:
 *  1. FAQ 있는 본문 → @graph에 Article + FAQPage 둘 다
 *  2. FAQ 없는 본문 → Article만 (graceful, R9)
 *  3. breadcrumb opt → BreadcrumbList 포함
 *  4. card-news post → FAQPage 추출 안 함 (gate, M1)
 *  5. (H6) hygiene-pass FAQ + 가격 단정 없음 → schema 정상
 */

import { buildArticleGraphJsonLd } from "./article-jsonld";
import type { Post } from "@/types/post";

let failures = 0;
function assert(name: string, cond: boolean, info?: unknown): void {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    console.error(`  ✗ ${name}`, info ?? "");
    failures++;
  }
}

// 환경변수 — base URL 고정 (test reproducibility)
process.env.NEXT_PUBLIC_BASE_URL = "https://www.cheonggwang.kr";

function makePost(over: Partial<Post> = {}): Post {
  return {
    id: "test-id",
    providerId: "test-provider",
    providerOwnerUid: "uid-1",
    companyName: "강남 코워킹스페이스",
    categories: ["office"],
    regionLabel: "강남구",
    title: "사무실 청소 후기",
    slug: "test-slug",
    coverImageUrl: "https://example.com/cover.jpg",
    coverImageAlt: "사무실 입구",
    bodyMarkdown: "본문...",
    summary80: "사무실 청소 후기 80자 요약",
    topicHint: null,
    brandTone: "friendly",
    createdAt: new Date("2026-04-20T10:00:00Z"),
    updatedAt: new Date("2026-04-22T15:00:00Z"),
    publishedAt: new Date("2026-04-22T15:00:00Z"),
    postType: "partner-promo",
    publishStatus: "published",
    ...over,
  };
}

// Case 1: FAQ 있는 본문
{
  const md = `## 청소 비용은?

저희 매장은 평방미터당 청구합니다.

## 자주 묻는 질문

### Q1. 예약은 어떻게 하나요?

홈페이지에서 견적 요청 후 진행됩니다.

### Q2. 출장 가능 지역은?

서울 전 지역과 경기 일부 가능합니다.
`;
  const post = makePost({ bodyMarkdown: md });
  buildArticleGraphJsonLd(post).then((g) => {
    assert("Case 1: @graph 길이 2 (Article + FAQPage)", g["@graph"].length === 2, g);
    assert(
      "Case 1: Article + FAQPage 타입 확인",
      g["@graph"][0]["@type"] === "Article" &&
        g["@graph"][1]["@type"] === "FAQPage",
      g["@graph"].map((n) => n["@type"]),
    );
    const faq = g["@graph"][1] as { mainEntity: Array<{ name: string }> };
    assert("Case 1: FAQ 2개 entry", faq.mainEntity.length === 2, faq);
  });
}

// Case 2: FAQ 없는 본문 → graceful
{
  const post = makePost({ bodyMarkdown: "## 본문\n내용..." });
  buildArticleGraphJsonLd(post).then((g) => {
    assert("Case 2: @graph 길이 1 (Article only)", g["@graph"].length === 1, g);
    assert(
      "Case 2: Article만 포함",
      g["@graph"][0]["@type"] === "Article",
      g["@graph"],
    );
  });
}

// Case 3: breadcrumb opt
{
  const post = makePost();
  buildArticleGraphJsonLd(post, {
    breadcrumb: { panelLabel: "의뢰업체 홍보", panelSlug: "partners" },
  }).then((g) => {
    const types = g["@graph"].map((n) => n["@type"]);
    assert(
      "Case 3: BreadcrumbList 포함",
      types.includes("BreadcrumbList"),
      types,
    );
    const bc = g["@graph"].find((n) => n["@type"] === "BreadcrumbList") as
      | { itemListElement: Array<{ position: number; name: string }> }
      | undefined;
    assert("Case 3: 3 items (홈/패널/글)", bc?.itemListElement.length === 3, bc);
    assert(
      "Case 3: position 1-based",
      bc?.itemListElement[0].position === 1,
      bc,
    );
  });
}

// Case 4: card-news → FAQPage 추출 안 함 (gate)
{
  const md = `## 자주 묻는 질문

### Q1. 카드뉴스에도 FAQ?

이 글은 card-news라서 FAQ 추출되면 안 됨.
`;
  const post = makePost({ bodyMarkdown: md, format: "card-news" });
  buildArticleGraphJsonLd(post).then((g) => {
    const types = g["@graph"].map((n) => n["@type"]);
    assert(
      "Case 4: card-news → FAQPage 미포함",
      !types.includes("FAQPage"),
      types,
    );
  });
}

// Case 5 (H6): hygiene-pass FAQ
{
  const md = `## 자주 묻는 질문

### Q1. 가격이 어떻게 되나요?

가격은 매장에 직접 문의해 주세요. (사실 단정 안 함)

### Q2. 영업시간은?

영업시간은 매장 페이지에서 확인 가능합니다.
`;
  const post = makePost({ bodyMarkdown: md });
  buildArticleGraphJsonLd(post).then((g) => {
    const faq = g["@graph"].find((n) => n["@type"] === "FAQPage") as
      | { mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> }
      | undefined;
    assert("Case 5: FAQPage 포함", !!faq, g);
    assert(
      "Case 5: 답변에 가격 단정 없음 (hygiene 안전)",
      faq?.mainEntity.every(
        (q) =>
          !/[0-9]+\s*원/.test(q.acceptedAnswer.text) &&
          !/[0-9]+\s*%\s*할인/.test(q.acceptedAnswer.text),
      ) === true,
      faq,
    );
  });
}

// 비동기 promise 들이 모두 resolve된 후 결과 출력
setTimeout(() => {
  if (failures > 0) {
    console.error(`\n❌ ${failures} test(s) failed.`);
    process.exit(1);
  }
  console.log("\n✅ all article-jsonld tests passed");
}, 100);
