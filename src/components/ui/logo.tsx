import Link from "next/link";
import { SITE } from "@/constants/site";
import { cn } from "@/lib/utils/cn";

/** Brand mark: an arched niche in a wall (diwar) holding a heart-shaped leaf. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-10", className)}>
      <rect width="40" height="40" rx="12" className="fill-faiz-700" />
      <path d="M11 31V18.5a9 9 0 0 1 18 0V31" fill="none" className="stroke-cream-50" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M8 31h24" className="stroke-cream-50" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M20 27.5c-3.6-2.4-5.5-4.6-5.5-7a2.9 2.9 0 0 1 5.5-1.3 2.9 2.9 0 0 1 5.5 1.3c0 2.4-1.9 4.6-5.5 7Z"
        className="fill-saffron-400"
      />
    </svg>
  );
}

export function Logo({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-3", className)} aria-label={`${SITE.name} — home`}>
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6" />
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-xl font-semibold tracking-tight", tone === "dark" ? "text-ink-900" : "text-cream-50")}>
          Diwar-e-Faiz
        </span>
        <span lang="ur" dir="rtl" className={cn("mt-0.5 text-right text-xs leading-[1.9]!", tone === "dark" ? "text-faiz-600" : "text-faiz-200")}>
          {SITE.nameUrdu}
        </span>
      </span>
    </Link>
  );
}
