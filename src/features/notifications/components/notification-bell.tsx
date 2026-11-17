"use client";

import { collection, limit, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { Bell, BellRing, CheckCheck, Gift, HandHeart, MessageCircle, ShieldAlert, ShieldCheck, Undo2, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";
import { markAllNotificationsRead, markNotificationsRead } from "@/server/actions/notifications";
import type { NotificationType } from "@/types/firestore";

type Item = { id: string; type: NotificationType; title: string; body: string; link: string; read: boolean; createdAt: string | null };

const ICONS: Record<NotificationType, LucideIcon> = {
  application_received: HandHeart,
  application_accepted: BellRing,
  application_declined: Undo2,
  message: MessageCircle,
  donation_approved: ShieldCheck,
  donation_rejected: ShieldAlert,
  donation_given: Gift,
  report_update: ShieldCheck,
};

/** Live notification bell. Reads users/{uid}/notifications directly (rules: owner only); marks read via server actions. */
export function NotificationBell({ className }: { className?: string }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const uid = status === "signed-in" ? user?.uid : undefined;

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(getDb(), COLLECTIONS.users, uid, COLLECTIONS.notifications), orderBy("createdAt", "desc"), limit(20));
    return onSnapshot(
      q,
      (snap) =>
        setItems(
          snap.docs.map((d) => {
            const n = d.data() as Omit<Item, "id" | "createdAt"> & { createdAt: Timestamp | null };
            return { ...n, id: d.id, createdAt: n.createdAt?.toDate().toISOString() ?? null };
          }),
        ),
      () => setItems([]),
    );
  }, [uid]);

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

  if (!uid) return null;
  const unread = items.filter((n) => !n.read).length;

  function openItem(n: Item) {
    setOpen(false);
    if (!n.read) {
      setItems((all) => all.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      void markNotificationsRead({ notificationIds: [n.id] });
    }
    // Links are written by the server, but only ever follow in-app paths.
    if (n.link.startsWith("/") && !n.link.startsWith("//")) router.push(n.link);
  }

  async function readAll() {
    setItems((all) => all.map((x) => ({ ...x, read: true })));
    await markAllNotificationsRead();
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex size-10 cursor-pointer items-center justify-center rounded-full text-ink-700 transition hover:bg-cream-200"
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex min-w-4.5 items-center justify-center rounded-full bg-saffron-600 px-1 text-[10px] leading-4.5 font-bold text-white ring-2 ring-cream-100">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-18 z-50 animate-toast-in rounded-3xl bg-white shadow-lift ring-1 ring-ink-900/5 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-ink-900/5 px-5 py-3.5">
            <p className="font-semibold text-ink-900">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={readAll} className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-faiz-700 hover:underline">
                <CheckCheck className="size-3.5" aria-hidden /> Mark all as read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-sand-600">
              Nothing yet. You&apos;ll hear here when someone requests your item or replies to you.
            </p>
          ) : (
            <ul className="max-h-[min(28rem,70dvh)] overflow-y-auto p-2">
              {items.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openItem(n)}
                      className={cn("flex w-full cursor-pointer gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-cream-100", !n.read && "bg-faiz-50/70")}
                    >
                      <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full", n.read ? "bg-cream-200 text-sand-600" : "bg-faiz-100 text-faiz-700")}>
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-sm text-ink-900", !n.read && "font-semibold")}>{n.title}</span>
                        <span className="mt-0.5 line-clamp-2 block text-sm text-sand-600">{n.body}</span>
                        {n.createdAt && <span className="mt-1 block text-[11px] text-sand-500">{formatDateTime(n.createdAt)}</span>}
                      </span>
                      {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-saffron-600" aria-label="Unread" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
