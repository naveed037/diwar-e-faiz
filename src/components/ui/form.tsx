import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const control =
  "w-full rounded-2xl border border-ink-900/10 bg-white px-4 text-[15px] text-ink-900 shadow-[0_1px_2px_rgb(22_26_20/0.04)] " +
  "placeholder:text-sand-400 transition-colors focus:border-faiz-500 focus:ring-4 focus:ring-faiz-500/15 focus:outline-none " +
  "aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-400/15 disabled:bg-cream-200";

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

/** Label + control + hint/error, wired for screen readers via `${htmlFor}-msg`. */
export function Field({ label, htmlFor, hint, error, optional, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between text-sm font-semibold text-ink-800">
        {label}
        {optional && <span className="text-xs font-normal text-sand-500">Optional</span>}
      </label>
      {children}
      {(error || hint) && (
        <p id={`${htmlFor}-msg`} className={cn("text-xs", error ? "font-medium text-red-600" : "text-sand-500")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-12", className)} {...props} />;
}

export function Textarea({ className, rows = 5, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(control, "resize-y py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(control, "h-12 cursor-pointer appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-sand-500" />
    </div>
  );
}

/** Props helper so every control reports its error state and description consistently. */
export function fieldA11y(id: string, error?: string, hasHint = false) {
  return {
    id,
    name: id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || hasHint ? `${id}-msg` : undefined,
  } as const;
}
