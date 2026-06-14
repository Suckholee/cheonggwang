"use client";

import Link from "next/link";
import type { QuoteCategory } from "@/domain/quote-category";

interface Props {
  providerId: string;
  category: QuoteCategory;
}

export function QuoteCTAButton({ providerId, category }: Props) {
  const href = `/quote/new?cat=${category}&providerId=${providerId}`;
  return (
    <Link
      href={href}
      className="block w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-center text-sm font-bold text-white transition-colors hover:bg-indigo-700"
    >
      💰 견적 요청하러 가기
    </Link>
  );
}
