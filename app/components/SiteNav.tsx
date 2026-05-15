"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/recommend", label: "PC 추천", code: "01" },
  { href: "/ai-price", label: "AI 가격 제안", code: "02" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-5 flex w-full gap-2 rounded-2xl border border-neutral-200 bg-white p-2.5 shadow-sm sm:mb-6 sm:gap-3 sm:p-3 lg:gap-4 lg:p-4"
      aria-label="기능 선택"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative flex min-h-[6.25rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-4 py-5 text-center font-mono transition-all sm:min-h-[6.75rem] sm:gap-2 sm:px-6 sm:py-6 lg:min-h-[7.5rem] xl:min-h-[8rem] xl:py-7 ${
              active
                ? "bg-neutral-500 text-white shadow-md ring-1 ring-neutral-400/40"
                : "border border-neutral-200 bg-neutral-50 text-neutral-900 hover:border-neutral-300 hover:bg-white"
            }`}
          >
            <span
              className={`text-xs font-semibold tabular-nums tracking-[0.35em] sm:text-sm ${
                active ? "text-neutral-100" : "text-neutral-500"
              }`}
            >
              {tab.code}
            </span>
            <span
              className={`text-xl font-bold leading-snug tracking-tight sm:text-2xl lg:text-3xl xl:text-[1.85rem] 2xl:text-[2rem] ${
                active ? "text-white" : "text-neutral-900"
              }`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
