import { MessagesSquare } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { DonorAvatar } from "@/features/donations/components/donor-avatar";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";
import type { ConversationSummary } from "@/server/db/requests";

export function ConversationList({ conversations }: { conversations: ConversationSummary[] }) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink-900/15 bg-white/60 px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-faiz-50 text-faiz-700">
          <MessagesSquare className="size-7" aria-hidden />
        </span>
        <h2 className="mt-5 font-display text-xl font-semibold text-ink-900">No conversations yet</h2>
        <p className="mt-2 max-w-sm text-sm text-sand-600">
          A private chat opens automatically when a donor accepts a request — yours or one for your item.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/requests" variant="outline">
            My requests
          </ButtonLink>
          <ButtonLink href="/my-donations">My donations</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-ink-900/5 overflow-hidden rounded-3xl bg-white ring-1 ring-ink-900/5">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link href={`/messages/${c.id}`} className="flex items-center gap-4 px-4 py-4 transition hover:bg-cream-50 sm:px-5">
            <DonorAvatar name={c.other.displayName} photoURL={c.other.photoURL} size={48} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className={cn("truncate text-ink-900", c.unread > 0 ? "font-bold" : "font-semibold")}>{c.other.displayName}</p>
                {(c.lastMessage?.sentAt ?? c.updatedAt) && (
                  <span className="shrink-0 text-xs text-sand-500">{formatDateTime((c.lastMessage?.sentAt ?? c.updatedAt)!)}</span>
                )}
              </div>
              <p className="truncate text-xs font-medium text-faiz-700">
                {c.role === "donor" ? "Your item" : "Item you requested"}: {c.donationTitle}
              </p>
              <p className={cn("mt-0.5 truncate text-sm", c.unread > 0 ? "font-medium text-ink-900" : "text-sand-600")}>
                {c.lastMessage ? `${c.lastMessage.mine ? "You: " : ""}${c.lastMessage.text}` : "No messages yet — say salaam!"}
              </p>
            </div>
            {c.unread > 0 && (
              <span className="flex min-w-6 shrink-0 items-center justify-center rounded-full bg-faiz-600 px-1.5 py-0.5 text-xs font-bold text-white">
                {c.unread > 9 ? "9+" : c.unread}
                <span className="sr-only"> unread</span>
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
