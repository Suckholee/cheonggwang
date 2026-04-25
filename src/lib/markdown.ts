import "server-only";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * v1.4 #1 provider-promo-content — 안전한 markdown → HTML 변환 (server-only).
 * 허용 태그: h2/h3/p/ul/ol/li/strong/em/a/br
 * 외부 링크 https:// 만 + rel="noopener noreferrer" + target="_blank" 강제.
 * 이미지 태그 제거 (cover image는 별도 controlled).
 */
export function renderMarkdown(md: string): string {
  const rawHtml = marked.parse(md, { async: false }) as string;
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
