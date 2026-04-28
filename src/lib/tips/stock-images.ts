import type { TipTopic } from "@/lib/tips/prompt";

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.8
 *
 * Unsplash 무료 이미지 풀 — category × 2-5 photos.
 * 신규 cycle #29에서 next.config.ts remotePatterns + should-unoptimize.ts에 등록됨.
 *
 * License: Unsplash License (CC0 X — attribution 권장).
 *
 * ⚠️ MIRROR of functions/src/tips/lib/stock-images.ts — keep in sync.
 *    CI lint: scripts/check-queue-mirror.mjs (STOCK_IMAGES 양 패키지 동일 export).
 */
export const STOCK_IMAGES: Record<TipTopic["category"], string[]> = {
  bathroom: [
    "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80",
    "https://images.unsplash.com/photo-1521783593447-5702b9bfd267?w=1200&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80",
  ],
  kitchen: [
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80",
    "https://images.unsplash.com/photo-1556909195-4e5d12d57da7?w=1200&q=80",
    "https://images.unsplash.com/photo-1565604742-b6a96e62a26c?w=1200&q=80",
  ],
  aircon: [
    "https://images.unsplash.com/photo-1631545341935-f86ddff3b56f?w=1200&q=80",
    "https://images.unsplash.com/photo-1581090700227-1e37b190418e?w=1200&q=80",
  ],
  living: [
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80",
    "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1200&q=80",
    "https://images.unsplash.com/photo-1487611459768-bd414656ea10?w=1200&q=80",
  ],
  move: [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
    "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=1200&q=80",
  ],
  general: [
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80",
    "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=1200&q=80",
  ],
};

export function pickStockImage(category: TipTopic["category"]): string {
  const pool = STOCK_IMAGES[category];
  return pool[Math.floor(Math.random() * pool.length)];
}
