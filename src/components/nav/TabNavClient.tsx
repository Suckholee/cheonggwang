"use client";

import { usePathname } from "next/navigation";
import { TabItem } from "./TabItem";
import {
  getTabs,
  isActiveTab,
  isHiddenPath,
  type TabSetKey,
} from "./tab-definitions";

interface Props {
  tabSetKey: TabSetKey;
  /** v1.2 chat feature에서 Props로 주입. 현재는 0. */
  chatUnreadCount?: number;
}

export function TabNavClient({ tabSetKey, chatUnreadCount = 0 }: Props) {
  const pathname = usePathname();
  if (isHiddenPath(pathname)) return null;

  const tabs = getTabs(tabSetKey);

  return (
    <nav
      aria-label="하단 내비게이션"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] border-t border-zinc-100 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex h-[var(--bottom-nav-height)] justify-between px-2">
        {tabs.map((tab) => (
          <TabItem
            key={tab.href}
            tab={tab}
            active={isActiveTab(pathname, tab)}
            badgeCount={
              tab.badgeKey === "chat-unread" ? chatUnreadCount : 0
            }
          />
        ))}
      </div>
    </nav>
  );
}
