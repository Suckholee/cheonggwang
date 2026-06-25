"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { clientAuth, clientDb } from "@/lib/firebase/client";
import {
  getTabs,
  isActiveTab,
  type TabSetKey,
} from "./tab-definitions";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { LogOut, User } from "lucide-react";

interface Props {
  tabSetKey: TabSetKey;
  chatUnreadCount?: number;
}

export function DesktopSidebar({ tabSetKey, chatUnreadCount = 0 }: Props) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const tabs = getTabs(tabSetKey);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(clientAuth, async (user) => {
      if (!user) {
        setUserName(null);
        return;
      }
      try {
        const snap = await getDoc(doc(clientDb, "users", user.uid));
        const data = snap.data();
        if (data?.displayName) {
          setUserName(data.displayName);
        } else {
          setUserName(user.displayName || "의뢰인");
        }
      } catch (e) {
        setUserName(user.displayName || "의뢰인");
      }
    });

    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      await clientAuth.signOut();
      // Clear cookie session via server action or refresh
      document.cookie = "__session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-zinc-150 bg-white dark:border-zinc-800 dark:bg-zinc-950 px-4 py-6 select-none shrink-0 z-30 justify-between">
      <div className="flex flex-col gap-8">
        {/* Top: Brand Logo */}
        <div className="flex items-center gap-2 px-2.5">
          <BrandLogo />
          <span className="text-[17px] font-black tracking-tight text-zinc-950 dark:text-zinc-50">
            청광
          </span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600 dark:bg-blue-950/40">
            PC
          </span>
        </div>

        {/* Middle: Navigation Links */}
        <nav className="flex flex-col gap-1.5" aria-label="사이드 내비게이션">
          {tabs.map((tab) => {
            const active = isActiveTab(pathname, tab);
            const Icon = tab.Icon;
            const isChat = tab.badgeKey === "chat-unread";
            const showBadge = isChat && chatUnreadCount > 0;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`group flex items-center justify-between rounded-2xl px-4 py-3.5 text-[13.5px] font-bold transition-all duration-200 cursor-pointer ${
                  active
                    ? "bg-blue-50/75 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                    : "text-zinc-650 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105 ${
                      active
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-zinc-400 group-hover:text-zinc-500 dark:text-zinc-500"
                    }`}
                  />
                  <span>{tab.label}</span>
                </div>

                {showBadge && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white border border-white dark:border-zinc-950 animate-pulse">
                    {chatUnreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: User Profile & Logout */}
      <div className="flex flex-col gap-4 border-t border-zinc-100 pt-5 dark:border-zinc-850">
        {userName && (
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shrink-0">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 text-xs">
              <p className="font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
                {userName}
              </p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                {tabSetKey === "provider" ? "청명 파트너" : "의뢰인"}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          type="button"
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-[13px] font-bold text-zinc-500 hover:bg-red-50/50 hover:text-red-600 transition dark:text-zinc-400 dark:hover:bg-red-950/20 dark:hover:text-red-400 cursor-pointer"
        >
          <LogOut className="h-4.5 w-4.5 text-zinc-400 group-hover:text-red-500" />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
