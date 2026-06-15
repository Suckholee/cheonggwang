import Link from "next/link";
import {
  UserPen,
  Inbox,
  Briefcase,
  Settings,
  type LucideIcon,
} from "lucide-react";

interface Props {
  requestBadgeCount: number;
}

export function ShortcutGrid({ requestBadgeCount }: Props) {
  const shortcuts = [
    {
      href: "/provider/requests",
      label: "받은 요청",
      Icon: Inbox,
      badge: requestBadgeCount,
      color: "text-rose-600 dark:text-rose-450",
      bg: "bg-rose-50/70 dark:bg-rose-950/40",
    },
    {
      href: "/provider/works",
      label: "작업 관리",
      Icon: Briefcase,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50/70 dark:bg-amber-950/40",
    },
    {
      href: "/provider/profile",
      label: "프로필 편집",
      Icon: UserPen,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50/70 dark:bg-blue-950/40",
    },
    {
      href: "/provider/settings",
      label: "설정",
      Icon: Settings,
      color: "text-zinc-650 dark:text-zinc-400",
      bg: "bg-zinc-100 dark:bg-zinc-800",
    },
  ];

  return (
    <section aria-labelledby="shortcut-heading" className="mb-6">
      <h2
        id="shortcut-heading"
        className="mb-3 text-[14px] font-extrabold text-zinc-800 dark:text-zinc-200"
      >
        빠른 이동
      </h2>
      <div className="grid grid-cols-2 gap-2.5">
        {shortcuts.map(({ href, label, Icon, badge, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="relative flex items-center gap-2.5 rounded-[24px] border border-zinc-200 border-b-4 border-b-zinc-300 bg-white px-3.5 py-4 hover:border-zinc-300 hover:scale-[1.02] active:scale-[0.97] active:translate-y-[2px] shadow-sm transition-all dark:bg-zinc-900 dark:border-zinc-800 dark:border-b-zinc-950"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}
            >
              <Icon className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="flex-1 min-w-0 text-[13px] font-extrabold text-zinc-850 dark:text-zinc-200 leading-tight">
              {label}
            </span>
            {badge && badge > 0 ? (
              <span
                aria-label={`${label} ${badge}건`}
                className="absolute top-2.5 right-2.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[9px] font-black text-white border border-white dark:border-zinc-900 shadow-xs"
              >
                {badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
