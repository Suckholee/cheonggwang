"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { clientAuth, clientDb } from "@/lib/firebase/client";
import { ChatUnreadWrapper } from "@/components/chat/ChatUnreadWrapper";

interface AuthContext {
  uid: string;
  /** Firestore user doc 기반 역할 (providerId 유무). null = 조회 실패/지연 */
  roleFromDoc: "client" | "provider" | null;
}

async function resolveAuthContext(uid: string): Promise<AuthContext> {
  const snap = await getDoc(doc(clientDb, "users", uid));
  const data = snap.data() as { providerId?: unknown } | undefined;
  const providerId =
    typeof data?.providerId === "string" && data.providerId.length > 0
      ? data.providerId
      : null;

  return {
    uid,
    roleFromDoc: providerId ? "provider" : "client",
  };
}

export function BottomTabNavServer() {
  const pathname = usePathname();
  const [ctx, setCtx] = useState<AuthContext | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(clientAuth, async (user) => {
      if (!user) {
        setCtx(null);
        setReady(true);
        return;
      }

      try {
        const next = await resolveAuthContext(user.uid);
        setCtx(next);
      } catch (e) {
        console.warn("[bottom-tab-nav] auth resolve 실패", e);
        setCtx({ uid: user.uid, roleFromDoc: null });
      } finally {
        setReady(true);
      }
    });

    return () => unsub();
  }, []);

  if (!ready || ctx === null) return null;

  // v1.6 — URL 경로를 1순위로: `/provider/*` 면 Firestore 조회 실패/지연과 무관하게 PROVIDER 탭.
  // 그 외엔 user doc 의 providerId 판별 결과 사용. 둘 다 없으면 CLIENT 탭 폴백.
  const pathSuggestsProvider =
    pathname.startsWith("/provider/") || pathname === "/provider";
  const role: "client" | "provider" = pathSuggestsProvider
    ? "provider"
    : ctx.roleFromDoc === "provider"
      ? "provider"
      : "client";

  return <ChatUnreadWrapper uid={ctx.uid} role={role} />;
}
