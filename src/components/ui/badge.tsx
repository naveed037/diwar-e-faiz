import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "green" | "neutral" | "saffron" | "white" | "muted";

const tones: Record<Tone, string> = {
  green: "bg-faiz-50 text-faiz-800 ring-faiz-700/10",
  neutral: "bg-cream-200 text-ink-700 ring-ink-900/5",
  saffron: "bg-saffron-100 text-saffron-600 ring-saffron-600/15",
  white: "bg-white/90 text-ink-800 ring-ink-900/5 backdrop-blur",
  muted: "bg-ink-900/70 text-cream-50 ring-white/10 backdrop-blur",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
