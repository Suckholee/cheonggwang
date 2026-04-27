import Link from "next/link";

export function BrandLogo() {
  return (
    <Link
      href="/"
      className="shrink-0 flex items-center gap-2 hover:opacity-80 transition-opacity"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2563EB] shadow-sm">
        <svg
          className="h-5 w-5 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-black tracking-widest text-[#2563EB] leading-tight font-mono">
          CHEONGGWANG
        </span>
        <span className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] leading-none -mt-0.5">
          청광
        </span>
      </div>
    </Link>
  );
}
