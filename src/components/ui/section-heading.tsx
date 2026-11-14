import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  urdu?: string;
  description?: ReactNode;
  align?: "left" | "center";
  action?: ReactNode;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  urdu,
  description,
  align = "left",
  action,
  className,
}: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        centered ? "items-center text-center" : "md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className={cn("max-w-2xl", centered && "mx-auto")}>
        {eyebrow && (
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-faiz-600 uppercase">
            <span aria-hidden className="h-px w-6 bg-faiz-500" />
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-3xl leading-[1.1] font-semibold tracking-tight text-ink-900 text-balance-safe sm:text-4xl">
          {title}
        </h2>
        {urdu && (
          <p lang="ur" dir="rtl" className={cn("mt-1 text-lg text-faiz-700", centered ? "text-center" : "text-left")}>
            {urdu}
          </p>
        )}
        {description && <p className="mt-4 text-base leading-relaxed text-sand-600 sm:text-lg">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
