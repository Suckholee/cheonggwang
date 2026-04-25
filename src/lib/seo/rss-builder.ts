/**
 * v1.6 Phase 5 — RSS 2.0 XML 직렬화.
 * 외부 의존성 없이 최소 구현 · 피드 구독기·RSS 리더 호환.
 *
 * W3C Feed Validator 권장 필드:
 *   channel: title · link · description · language · lastBuildDate
 *   item: title · link · guid · pubDate · description · author?
 */

export interface RssItem {
  title: string;
  link: string; // absolute URL
  description: string;
  pubDate: Date;
  author?: string;
  guid?: string; // default: link
}

export interface RssChannel {
  title: string;
  link: string; // absolute URL
  description: string;
  language?: string; // default 'ko-KR'
  items: RssItem[];
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc822(d: Date): string {
  // RSS 2.0 pubDate = RFC 822
  return d.toUTCString();
}

export function buildRss2_0(channel: RssChannel): string {
  const lang = channel.language ?? "ko-KR";
  const lastBuild =
    channel.items.length > 0
      ? toRfc822(
          channel.items.reduce(
            (max, i) => (i.pubDate > max ? i.pubDate : max),
            channel.items[0].pubDate,
          ),
        )
      : toRfc822(new Date());

  const itemsXml = channel.items
    .map(
      (i) => `
    <item>
      <title>${escapeXml(i.title)}</title>
      <link>${escapeXml(i.link)}</link>
      <guid isPermaLink="true">${escapeXml(i.guid ?? i.link)}</guid>
      <pubDate>${toRfc822(i.pubDate)}</pubDate>
      <description>${escapeXml(i.description)}</description>${
        i.author ? `\n      <author>${escapeXml(i.author)}</author>` : ""
      }
    </item>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <atom:link href="${escapeXml(channel.link)}" rel="self" type="application/rss+xml"/>
    <description>${escapeXml(channel.description)}</description>
    <language>${escapeXml(lang)}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>${itemsXml}
  </channel>
</rss>`;
}
