const UNOPTIMIZED_HOSTS = new Set(["placehold.co"]);

export function shouldUnoptimizeImage(src: string | null | undefined): boolean {
  if (!src) return false;

  try {
    const url = new URL(src);
    return UNOPTIMIZED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
