import {
  Home,
  Search,
  ClipboardList,
  MessageCircle,
  Newspaper,
  Inbox,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export type TabBadgeKey = "chat-unread";

export interface TabDefinition {
  href: string;
  label: string;
  Icon: LucideIcon;
  badgeKey?: TabBadgeKey;
  /** `/` 같은 홈 경로는 exact 매칭 (startsWith 하면 모든 경로에 활성) */
  exact?: boolean;
}

export const CLIENT_TABS: readonly TabDefinition[] = [
  { href: "/", label: "홈", Icon: Home, exact: true },
  { href: "/search", label: "업체찾기", Icon: Search },
  { href: "/received", label: "받은견적", Icon: ClipboardList },
  {
    href: "/chat",
    label: "채팅",
    Icon: MessageCircle,
    badgeKey: "chat-unread",
  },
  { href: "/community", label: "커뮤니티", Icon: Newspaper },
] as const;

export const PROVIDER_TABS: readonly TabDefinition[] = [
  { href: "/provider/home", label: "홈", Icon: Home, exact: true },
  { href: "/provider/requests", label: "요청", Icon: Inbox },
  { href: "/provider/works", label: "작업", Icon: Briefcase },
  {
    href: "/chat",
    label: "채팅",
    Icon: MessageCircle,
    badgeKey: "chat-unread",
  },
  { href: "/community", label: "커뮤니티", Icon: Newspaper },
] as const;

export type TabSetKey = "client" | "provider";

export function getTabs(key: TabSetKey): readonly TabDefinition[] {
  return key === "provider" ? PROVIDER_TABS : CLIENT_TABS;
}

/** active 판단: exact면 === · 아니면 href 또는 href+'/' prefix */
export function isActiveTab(pathname: string | null, tab: TabDefinition): boolean {
  if (!pathname) return false;
  if (tab.exact) return pathname === tab.href;
  if (pathname === tab.href) return true;
  if (tab.href === "/received" && pathname.startsWith("/quote")) return true;
  return pathname.startsWith(tab.href + "/");
}

/** nav를 숨겨야 하는 경로 (비로그인·법적·운영 콘솔 페이지) */
const HIDDEN_PATTERNS: readonly RegExp[] = [
  /^\/login(\/|$)/,
  /^\/signup-provider(\/|$)/,
  /^\/signup-partner(\/|$)/,
  /^\/terms(\/|$)/,
  /^\/privacy(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/chat\/[^/]+$/,
];

export function isHiddenPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return HIDDEN_PATTERNS.some((p) => p.test(pathname));
}
