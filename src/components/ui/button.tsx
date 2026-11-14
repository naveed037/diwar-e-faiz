import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "light" | "accent";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-all duration-200 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer";

const variants: Record<Variant, string> = {
  primary:
    "bg-faiz-700 text-cream-50 shadow-[0_1px_0_rgb(255_255_255/0.12)_inset,0_8px_20px_-8px_rgb(23_67_46/0.6)] hover:bg-faiz-800 focus-visible:outline-faiz-600",
  secondary: "bg-faiz-50 text-faiz-800 hover:bg-faiz-100 focus-visible:outline-faiz-500",
  outline:
    "border border-faiz-700/20 bg-white/70 text-faiz-800 backdrop-blur hover:border-faiz-700/40 hover:bg-white focus-visible:outline-faiz-500",
  ghost: "text-ink-700 hover:bg-cream-200 hover:text-faiz-800 focus-visible:outline-faiz-500",
  light: "bg-cream-50 text-faiz-800 hover:bg-white focus-visible:outline-cream-50",
  accent: "bg-saffron-400 text-faiz-950 hover:bg-[#d9a43c] focus-visible:outline-saffron-600",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
  icon: "size-10",
};

export type ButtonStyleProps = { variant?: Variant; size?: Size; className?: string };

export function buttonStyles({ variant = "primary", size = "md", className }: ButtonStyleProps = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & ButtonStyleProps;

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & ButtonStyleProps;

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonStyles({ variant, size, className })} {...props} />;
}
