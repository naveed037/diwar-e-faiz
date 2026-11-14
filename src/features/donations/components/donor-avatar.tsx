import Image from "next/image";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";

export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?"
  );
}

/** Profile photo when available, otherwise a coloured initials avatar. */
export function DonorAvatar({ name, photoURL, size = 40, className }: { name: string; photoURL: string | null; size?: number; className?: string }) {
  if (photoURL) {
    return (
      <span className={cn("relative block shrink-0 overflow-hidden rounded-full bg-cream-200", className)} style={{ width: size, height: size }}>
        <Image src={photoURL} alt="" fill sizes={`${size}px`} className="object-cover" />
      </span>
    );
  }
  return (
    <Avatar
      initials={initialsOf(name)}
      className={className}
      size={size <= 30 ? "sm" : size >= 56 ? "lg" : "md"}
    />
  );
}
