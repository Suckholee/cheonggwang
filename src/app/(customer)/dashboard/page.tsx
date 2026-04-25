import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { userRepository } from "@/lib/firebase/user-repository";

export const metadata = {
  title: "청광",
};

/**
 * `/dashboard`는 legacy promo-page 진입점이었음. Marketplace 전환 후 role-aware router로 변경:
 * - user.providerId 존재 → `/provider/profile` (청명 홈)
 * - else → `/` (의뢰인 마켓플레이스 홈)
 * v1.1b에서 client-dashboard / provider-dashboard 정식 구현.
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">이동 중...</div>}>
      <RoleRouter />
    </Suspense>
  );
}

async function RoleRouter(): Promise<null> {
  const jar = await cookies();
  let uid: string;
  try {
    uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    redirect("/login?next=/dashboard");
  }

  const user = await userRepository.get(uid);
  const providerId = (user as { providerId?: string } | null)?.providerId;

  if (providerId) {
    redirect("/provider/profile");
  }
  redirect("/");
}
