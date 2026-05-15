"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/recommend", label: "PC 추천" },
  { href: "/ai-price", label: "AI 가격 제안" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-4 flex w-full gap-1 rounded-lg border border-neutral-200 bg-white p-1 shadow-sm"
      aria-label="기능 선택"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 rounded-md px-3 py-2.5 text-center text-sm font-semibold transition-colors sm:py-3 sm:text-base ${
              active
                ? "bg-neutral-500 text-white"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
