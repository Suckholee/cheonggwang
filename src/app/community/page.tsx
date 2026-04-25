import { redirect } from "next/navigation";

/**
 * v1.6 community-feed-3panel — /community 루트는 기본 패널로 리다이렉트.
 * Design §3.1: 기본 패널은 `tips`.
 */
export default function CommunityRoot() {
  redirect("/community/tips");
}
