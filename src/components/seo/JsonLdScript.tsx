/**
 * v1.6 Phase 5 — JSON-LD 렌더.
 *
 * Server Component로 렌더 가능 (Next 16 확인됨).
 * `<` → `\u003c` 이스케이프로 XSS 방지 (Next 공식 가이드 준수).
 */
interface Props {
  data: unknown;
}

export function JsonLdScript({ data }: Props) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
