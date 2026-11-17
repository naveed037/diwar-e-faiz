"use client";

import { collection, limitToLast, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { ArrowLeft, Lock, SendHorizontal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert, Spinner } from "@/features/auth/components/auth-bits";
import { DonorAvatar } from "@/features/donations/components/donor-avatar";
import { getDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";
import { markConversationRead, sendMessage } from "@/server/actions/messages";
import type { ConversationDetail } from "@/server/db/requests";

type ChatMessage = { id: string; senderId: string; text: string; sentAt: string | null };

const MAX_LENGTH = 2000;

/**
 * Real-time chat. Messages are *read* straight from Firestore (rules allow only the two participants)
 * and *sent* through a server action, which validates them and updates unread counts.
 */
export function ChatThread({ conversation, myUid }: { conversation: ConversationDetail; myUid: string }) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastReadCount = useRef(-1);

  useEffect(() => {
    const q = query(
      collection(getDb(), COLLECTIONS.conversations, conversation.id, COLLECTIONS.messages),
      orderBy("createdAt", "asc"),
      limitToLast(300),
    );
    return onSnapshot(
      q,
      (snap) =>
        setMessages(
          snap.docs.map((d) => {
            const m = d.data() as { senderId: string; text: string; createdAt: Timestamp | null };
            return { id: d.id, senderId: m.senderId, text: m.text, sentAt: m.createdAt?.toDate().toISOString() ?? null };
          }),
        ),
      () => setLoadError("Messages couldn't be loaded. Please refresh the page."),
    );
  }, [conversation.id]);

  // Keep the newest message in view and clear this user's unread counter whenever new messages arrive.
  useEffect(() => {
    if (!messages) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
    if (messages.length !== lastReadCount.current) {
      lastReadCount.current = messages.length;
      void markConversationRead({ conversationId: conversation.id });
    }
  }, [messages, conversation.id]);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setSendError(undefined);
    const result = await sendMessage({ conversationId: conversation.id, text: value });
    setSending(false);
    if (!result.ok) return setSendError(result.message);
    setText("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  const { other } = conversation;

  return (
    <div className="flex h-[calc(100dvh-10rem)] min-h-[28rem] flex-col overflow-hidden rounded-4xl bg-white ring-1 ring-ink-900/5">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-ink-900/5 px-4 py-3 sm:px-5">
        <Link href="/messages" className="-ml-1 rounded-full p-2 text-sand-600 hover:bg-cream-100" aria-label="Back to all messages">
          <ArrowLeft className="size-5" />
        </Link>
        <Link href={`/users/${other.uid}`} className="flex min-w-0 flex-1 items-center gap-3">
          <DonorAvatar name={other.displayName} photoURL={other.photoURL} size={40} />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink-900">{other.displayName}</span>
            <span className="block truncate text-xs text-sand-600">
              {conversation.role === "donor" ? "Requested your item" : "Donor"}
              {other.city && ` · ${other.city}`}
            </span>
          </span>
        </Link>
        <Link
          href={`/donations/${conversation.donationId}`}
          className="flex max-w-[40%] items-center gap-2 rounded-2xl bg-cream-100 p-1.5 pr-3 text-xs font-medium text-ink-700 hover:bg-cream-200"
        >
          {conversation.donationImage && (
            <span className="relative size-8 shrink-0 overflow-hidden rounded-xl bg-cream-200">
              <Image src={conversation.donationImage} alt="" fill sizes="32px" className="object-cover" />
            </span>
          )}
          <span className="truncate">{conversation.donationTitle}</span>
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-cream-50 px-4 py-5 sm:px-6" aria-live="polite">
        {loadError ? (
          <FormAlert>{loadError}</FormAlert>
        ) : messages === null ? (
          <div className="flex h-full items-center justify-center text-sand-500">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="mx-auto max-w-sm py-10 text-center text-sm text-sand-600">
            <p className="font-semibold text-ink-900">Start the conversation</p>
            <p className="mt-1">
              {conversation.role === "donor"
                ? `Say salaam to ${other.displayName} and agree on a time and place for the handover.`
                : `Thank ${other.displayName} and agree on a time and place to collect the item.`}
            </p>
            <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-xs ring-1 ring-ink-900/5">
              Stay safe: meet in a public place, and never send money — everything on Diwar-e-Faiz is free.
            </p>
          </div>
        ) : (
          <ol className="space-y-2">
            {messages.map((m, i) => {
              const mine = m.senderId === myUid;
              const prev = messages[i - 1];
              const grouped = prev?.senderId === m.senderId;
              return (
                <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start", !grouped && i > 0 && "pt-2")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed sm:max-w-[70%]",
                      mine ? "rounded-br-lg bg-faiz-700 text-cream-50" : "rounded-bl-lg bg-white text-ink-900 ring-1 ring-ink-900/5",
                    )}
                  >
                    <p className="break-words whitespace-pre-line">{m.text}</p>
                    {m.sentAt && (
                      <p className={cn("mt-1 text-[11px]", mine ? "text-cream-50/70" : "text-sand-500")}>{formatDateTime(m.sentAt)}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {conversation.open ? (
        <form onSubmit={submit} className="border-t border-ink-900/5 p-3 sm:p-4">
          {sendError && (
            <div className="mb-3">
              <FormAlert>{sendError}</FormAlert>
            </div>
          )}
          <div className="flex items-end gap-2">
            <label htmlFor="chat-message" className="sr-only">
              Message {other.displayName}
            </label>
            <textarea
              id="chat-message"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Write a message…"
              className="max-h-40 min-h-12 flex-1 resize-none rounded-3xl bg-cream-100 px-4 py-3 text-[15px] text-ink-900 placeholder:text-sand-400 focus:ring-2 focus:ring-faiz-500 focus:outline-none [field-sizing:content]"
            />
            <Button type="submit" size="icon" className="size-12 shrink-0" disabled={sending || !text.trim()} aria-label="Send message">
              {sending ? <Spinner /> : <SendHorizontal className="size-5" />}
            </Button>
          </div>
          <p className="mt-2 hidden text-xs text-sand-500 sm:block">Enter to send · Shift + Enter for a new line</p>
        </form>
      ) : (
        <p className="flex items-center justify-center gap-2 border-t border-ink-900/5 px-4 py-4 text-sm text-sand-600">
          <Lock className="size-4" aria-hidden />
          This conversation is closed because the request was withdrawn or released.
        </p>
      )}
    </div>
  );
}
