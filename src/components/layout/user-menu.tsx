"use client";

import { ChevronDown, HandHeart, Inbox, LogOut, MessagesSquare, PackageOpen, ShieldCheck, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { signOut } from "@/features/auth/lib/auth-client";
import { cn } from "@/lib/utils/cn";

function initialsOf(name: string | null, email: string | null) {
  const source = name || email || "?";
  return source
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function UserAvatar({ size = 36 }: { size?: number }) {
  const { user } = useAuth();
  if (!user) return null;
  return user.photoURL ? (
    <span className="relative block overflow-hidden rounded-full ring-2 ring-white" style={{ width: size, height: size }}>
      <Image src={user.photoURL} alt="" fill sizes={`${size}px`} className="object-cover" />
    </span>
  ) : (
    <Avatar initials={initialsOf(user.displayName, user.email)} className="ring-2 ring-white" />
  );
}

/** Desktop account control: "Sign in" when signed out, avatar dropdown when signed in. */
export function UserMenu() {
  const { status, user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (status === "loading") return <span aria-hidden className="size-9 animate-pulse rounded-full bg-cream-300" />;
  if (status !== "signed-in" || !user) {
    return (
      <ButtonLink href="/login" variant="ghost">
        Sign in
      </ButtonLink>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="flex cursor-pointer items-center gap-1 rounded-full p-0.5 pr-2 transition hover:bg-cream-200"
      >
        <UserAvatar />
        <ChevronDown className={cn("size-4 text-sand-500 transition", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 animate-toast-in rounded-3xl bg-white p-2 shadow-lift ring-1 ring-ink-900/5">
          <div className="border-b border-ink-900/5 px-3 pt-2 pb-3">
            <p className="truncate font-semibold text-ink-900">{user.displayName ?? "Your account"}</p>
            <p className="truncate text-xs text-sand-500">{user.email}</p>
          </div>
          <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-ink-800 hover:bg-cream-100">
            <UserRound className="size-4 text-sand-500" aria-hidden /> My profile
          </Link>
          <Link role="menuitem" href="/donate" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-ink-800 hover:bg-cream-100">
            <HandHeart className="size-4 text-sand-500" aria-hidden /> Donate something
          </Link>
          <Link role="menuitem" href="/my-donations" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-ink-800 hover:bg-cream-100">
            <PackageOpen className="size-4 text-sand-500" aria-hidden /> My donations
          </Link>
          <Link role="menuitem" href="/requests" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-ink-800 hover:bg-cream-100">
            <Inbox className="size-4 text-sand-500" aria-hidden /> My requests
          </Link>
          <Link role="menuitem" href="/messages" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-ink-800 hover:bg-cream-100">
            <MessagesSquare className="size-4 text-sand-500" aria-hidden /> Messages
          </Link>
          {user.isAdmin && (
            <Link
              role="menuitem"
              href="/admin/moderation"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-faiz-800 hover:bg-faiz-50"
            >
              <ShieldCheck className="size-4 text-faiz-600" aria-hidden /> Moderation
            </Link>
          )}
          <button
            role="menuitem"
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.replace("/");
              router.refresh();
            }}
            className="flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
