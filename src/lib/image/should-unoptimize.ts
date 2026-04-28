// cycle #29 — Unsplash CDN은 자체 최적화 + 무료 quota 처리. 재최적화 회피.
const UNOPTIMIZED_HOSTS = new Set(["placehold.co", "images.unsplash.com"]);

export function shouldUnoptimizeImage(src: string | null | undefined): boolean {
  if (!src) return false;

  try {
    const url = new URL(src);
    return UNOPTIMIZED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
