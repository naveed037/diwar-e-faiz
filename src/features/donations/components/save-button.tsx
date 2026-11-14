"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils/cn";

/** Local-only "save for later" toggle. Will persist to the user's Firestore profile once auth exists. */
export function SaveButton({
  title,
  variant = "floating",
  className,
}: {
  title: string;
  variant?: "floating" | "inline";
  className?: string;
}) {
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);

  function toggle() {
    setSaved((s) => !s);
    toast(saved ? `Removed "${title}" from your saved items.` : `Saved "${title}" — find it again anytime.`, saved ? "info" : "success");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 transition active:scale-90",
        variant === "floating" &&
          "size-9 rounded-full bg-white/90 text-ink-800 shadow-soft backdrop-blur hover:bg-white hover:text-red-500",
        variant === "inline" &&
          "h-11 rounded-full border border-ink-900/10 bg-white px-5 text-sm font-semibold text-ink-800 hover:border-ink-900/20",
        className,
      )}
    >
      <Heart className={cn("size-4 transition", saved && "fill-red-500 text-red-500")} aria-hidden />
      {variant === "inline" && (saved ? "Saved" : "Save")}
    </button>
  );
}
