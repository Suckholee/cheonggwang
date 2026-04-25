import Link from "next/link";

export function BrandLogo() {
  return (
    <Link
      href="/"
      className="shrink-0 flex flex-col items-center gap-[3px] hover:opacity-80 pt-1"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#2B66F6]">
        <svg
          className="h-[20px] w-[20px] text-white"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 3V21M3 12H21"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="square"
          />
          <rect x="10.5" y="10.5" width="3" height="3" fill="#2B66F6" />
          <path
            d="M16 5H19V8M8 19H5V16"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
          />
        </svg>
      </div>
      <span className="text-[10px] font-extrabold tracking-tighter text-[#2B66F6] leading-none">
        청광
      </span>
    </Link>
  );
}
