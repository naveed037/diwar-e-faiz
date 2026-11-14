import { cn } from "@/lib/utils/cn";

const palettes = [
  "bg-faiz-100 text-faiz-800",
  "bg-saffron-100 text-saffron-600",
  "bg-cream-300 text-ink-700",
  "bg-faiz-700 text-cream-50",
];

/** Initials avatar. Colour is derived from the initials so the same person always looks the same. */
export function Avatar({
  initials,
  size = "md",
  className,
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const index = [...initials].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % palettes.length;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold tracking-wide",
        palettes[index],
        size === "sm" && "size-7 text-[10px]",
        size === "md" && "size-10 text-xs",
        size === "lg" && "size-14 text-base",
        className,
      )}
    >
      {initials}
    </span>
  );
}
