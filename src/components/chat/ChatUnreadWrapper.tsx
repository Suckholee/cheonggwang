"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import { TabNavClient } from "@/components/nav/TabNavClient";
import { DesktopSidebar } from "@/components/nav/DesktopSidebar";
import type { ThreadRole } from "@/types/chat";

interface Props {
  uid: string;
  role: ThreadRole;
}

export function ChatUnreadWrapper({ uid, role }: Props) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const field = role === "client" ? "clientUid" : "providerOwnerUid";
    const countField =
      role === "client" ? "unreadByClient" : "unreadByProvider";
    const q = query(collection(clientDb, "threads"), where(field, "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const total = snap.docs.reduce((sum, d) => {
          const v = (d.data() as DocumentData)[countField];
          return sum + (typeof v === "number" ? v : 0);
        }, 0);
        setUnread(total);
      },
      (err) => {
        console.warn("[chat] ChatUnreadWrapper onSnapshot error:", err);
      },
    );
    return () => unsub();
  }, [uid, role]);

  return (
    <>
      <TabNavClient tabSetKey={role} chatUnreadCount={unread} />
      <DesktopSidebar tabSetKey={role} chatUnreadCount={unread} />
    </>
  );
}
