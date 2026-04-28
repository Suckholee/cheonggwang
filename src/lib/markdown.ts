import "server-only";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * v1.4 #1 provider-promo-content — 안전한 markdown → HTML 변환 (server-only).
 * 허용 태그: h2/h3/p/ul/ol/li/strong/em/a/br
 * 외부 링크 https:// 만 + rel="noopener noreferrer" + target="_blank" 강제.
 * 이미지 태그 제거 (cover image는 별도 controlled).
 */
/**
 * v1.15 cycle #28 hotfix — AI가 본문에 남기는 [사진 N] 참조 제거.
 * card-news → blog fallback 시 또는 일반 blog 생성 시 AI가 "[사진 2]에서 볼 수 있듯이"
 * 같은 placeholder를 본문에 작성하는 케이스. blog는 단일 커버 이미지만 노출하므로
 * 이런 참조가 무의미함. 사용자 가독성 향상.
 *
 * 패턴: [사진 1], [사진2], [사진 2번] 등.
 * 주변 조사("에서", "처럼", "을")는 그대로 두고 placeholder만 제거.
 */
function stripPhotoPlaceholders(md: string): string {
  return md
    // [사진 N] + 조사 + (있듯이/같이/처럼) 조합 통째로 제거 (가장 흔한 패턴)
    .replace(
      /\[\s*사진\s*\d+\s*(?:번)?\s*\]\s*(?:에서\s*볼\s*수\s*있듯이|처럼|같이|에서)\s*[,.]?\s*/g,
      "",
    )
    // 잔여 [사진 N] 단독 제거
    .replace(/\[\s*사진\s*\d+\s*(?:번)?\s*\]\s*/g, "");
}

export function renderMarkdown(md: string): string {
  const cleaned = stripPhotoPlaceholders(md);
  const rawHtml = marked.parse(cleaned, { async: false }) as string;
  return sanitizeHtml(rawHtml, {
    allowedTags: [
      "h2",
      "h3",
      "p",
      "ul",
      "ol",
      "li",
      "strong",
      "em",
      "a",
      "br",
    ],
    allowedAttributes: {
      a: ["href", "title"],
    },
    allowedSchemes: ["https"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  });
}
