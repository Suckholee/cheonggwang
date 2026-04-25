"use client";

import Link from "next/link";

export function ResetFiltersButton() {
  return (
    <Link
      href="/search"
      className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
    >
      초기화
    </Link>
  );
}
