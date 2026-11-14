"use client";

import {
  BadgeCheck,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  ExternalLink,
  History,
  Mail,
  MapPin,
  PencilLine,
  ShieldAlert,
  Sparkles,
  StickyNote,
  Truck,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Textarea } from "@/components/ui/form";
import { getCategory } from "@/constants/categories";
import { FormAlert, Spinner } from "@/features/auth/components/auth-bits";
import { DonorAvatar } from "@/features/donations/components/donor-avatar";
import { cn } from "@/lib/utils/cn";
import { CONDITION_LABEL, formatDate } from "@/lib/utils/format";
import { moderateDonation } from "@/server/actions/admin";
import type { ModerationItem } from "@/server/db/admin";

const PICKUP_LABEL = { pickup: "Receiver picks up", delivery: "Donor delivers", either: "Pickup or delivery" } as const;

/** Common reasons, shown to the donor. Admins can add details or write their own. */
const REJECT_REASONS = [
  "Photos are missing, unclear or don't show the item.",
  "The listing asks for money, deposits or fees — every item must be free.",
  "This item isn't allowed (medicines, weapons, expired food, unsafe or broken electrical items).",
  "Please remove phone numbers or addresses from the description — they're shared privately after a request is accepted.",
  "The description needs more detail about the item's size, condition or what's included.",
  "This looks like a duplicate of another listing.",
];

export function ModerationQueue({ pending, total, recent }: { pending: ModerationItem[]; total: number; recent: ModerationItem[] }) {
  const [decided, setDecided] = useState<Record<string, "approved" | "rejected">>({});
  const remaining = pending.filter((p) => !decided[p.id]);
  // After router.refresh() the server `total` already excludes reviewed items, so only subtract
  // decisions that are still present in the current `pending` list (avoids double-counting).
  const waiting = total - (pending.length - remaining.length);

  return (
    <div className="space-y-12">
      <section aria-labelledby="queue-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="queue-heading" className="font-display text-2xl font-semibold text-ink-900">
            Waiting for review
          </h2>
          <p className="text-sm text-sand-600" aria-live="polite">
            {remaining.length === 0
              ? "All caught up"
              : `${waiting} waiting · oldest first`}
          </p>
        </div>

        {remaining.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-4xl border border-dashed border-ink-900/15 bg-white/60 px-6 py-16 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-faiz-50 text-faiz-700">
              <CircleCheckBig className="size-7" aria-hidden />
            </span>
            <p className="mt-5 font-display text-xl font-semibold text-ink-900">Nothing to review</p>
            <p className="mt-2 max-w-sm text-sm text-sand-600">New listings will appear here as soon as they&apos;re posted.</p>
          </div>
        ) : (
          <ul className="mt-6 space-y-6">
            {remaining.map((item) => (
              <li key={item.id}>
                <ReviewCard item={item} onDecided={(state) => setDecided((d) => ({ ...d, [item.id]: state }))} />
              </li>
            ))}
          </ul>
        )}
        {total > pending.length && remaining.length === 0 && (
          <p className="mt-4 text-center text-sm text-sand-600">More listings are waiting — reload to see the next batch.</p>
        )}
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="flex items-center gap-2 font-display text-2xl font-semibold text-ink-900">
            <History className="size-5 text-sand-500" aria-hidden />
            Recently reviewed
          </h2>
          <ul className="mt-6 divide-y divide-ink-900/5 overflow-hidden rounded-3xl bg-white ring-1 ring-ink-900/5">
            {recent.map((item) => (
              <li key={item.id} className="flex items-center gap-4 p-4">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-cream-200">
                  {item.images[0] && <Image src={item.images[0]} alt="" fill sizes="48px" className="object-cover" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-900">{item.title}</p>
                  <p className="truncate text-xs text-sand-600">
                    {item.donor.displayName}
                    {item.moderation.reviewedAt && ` · ${formatDate(item.moderation.reviewedAt)}`}
                    {item.moderation.reason && ` · “${item.moderation.reason}”`}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                    item.moderation.state === "approved" ? "bg-faiz-50 text-faiz-800" : "bg-red-50 text-red-700",
                  )}
                >
                  {item.moderation.state === "approved" ? "Approved" : "Rejected"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ReviewCard({ item, onDecided }: { item: ModerationItem; onDecided: (state: "approved" | "rejected") => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string>();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const rejectRef = useRef<HTMLDialogElement>(null);
  const category = getCategory(item.categoryId);
  const { donor } = item;

  async function decide(decision: "approve" | "reject", reason?: string) {
    setBusy(decision);
    setError(undefined);
    const result = await moderateDonation({ donationId: item.id, decision, reason });
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      if (result.code === "conflict") startTransition(() => router.refresh());
      return;
    }
    rejectRef.current?.close();
    toast(decision === "approve" ? `Approved “${item.title}” — it's now live.` : `Rejected “${item.title}”. The donor was notified.`);
    onDecided(decision === "approve" ? "approved" : "rejected");
    startTransition(() => router.refresh());
  }

  return (
    <article aria-labelledby={`title-${item.id}`} className="overflow-hidden rounded-4xl bg-white ring-1 ring-ink-900/5">
      <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
        {/* Photos */}
        <div className="border-b border-ink-900/5 bg-cream-100 p-4 sm:p-5 lg:border-r lg:border-b-0">
          {item.images.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {item.images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setLightbox(i)}
                  aria-label={`View photo ${i + 1} of ${item.images.length} full size`}
                  className={cn(
                    "relative cursor-zoom-in overflow-hidden rounded-2xl bg-cream-200 ring-1 ring-ink-900/5",
                    i === 0 ? "col-span-3 aspect-[4/3]" : "aspect-square",
                  )}
                >
                  <Image src={src} alt="" fill sizes={i === 0 ? "(min-width: 1024px) 40vw, 100vw" : "160px"} className="object-cover" />
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-red-50 p-6 text-center text-sm text-red-700">No photos</p>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {category && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-faiz-50 px-2.5 py-1 font-semibold text-faiz-800">
                <CategoryIcon name={category.icon} className="size-3.5" />
                {category.name}
              </span>
            )}
            {item.edited && (
              <span className="inline-flex items-center gap-1 rounded-full bg-saffron-100 px-2.5 py-1 font-semibold text-saffron-600">
                <PencilLine className="size-3.5" aria-hidden />
                Edited after posting
              </span>
            )}
            {item.status !== "available" && (
              <span className="rounded-full bg-cream-200 px-2.5 py-1 font-semibold text-ink-700">Status: {item.status}</span>
            )}
          </div>

          <h3 id={`title-${item.id}`} className="mt-3 font-display text-2xl leading-tight font-semibold text-ink-900">
            {item.title}
          </h3>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Fact icon={Sparkles} label="Condition" value={CONDITION_LABEL[item.condition]} />
            <Fact icon={Truck} label="Handover" value={PICKUP_LABEL[item.pickupPreference]} />
            <Fact icon={MapPin} label="Location" value={`${item.area}, ${item.city}`} />
            <Fact icon={Calendar} label="Posted" value={item.createdAt ? formatDate(item.createdAt) : "—"} />
          </dl>

          <p className="mt-5 text-[15px] leading-relaxed whitespace-pre-line text-ink-700">{item.description}</p>
          {item.notes && (
            <p className="mt-4 flex gap-2 rounded-2xl bg-cream-100 p-3 text-sm whitespace-pre-line text-ink-700">
              <StickyNote className="mt-0.5 size-4 shrink-0 text-sand-500" aria-hidden />
              {item.notes}
            </p>
          )}

          {/* Donor */}
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-cream-100 p-3">
            <DonorAvatar name={donor.displayName} photoURL={donor.photoURL} size={44} />
            <div className="min-w-0 flex-1 text-sm">
              <p className="flex items-center gap-1.5 font-semibold text-ink-900">
                <Link href={`/users/${donor.id}`} target="_blank" className="truncate hover:text-faiz-700">
                  {donor.displayName}
                </Link>
                {donor.verified && <BadgeCheck className="size-4 shrink-0 text-faiz-600" aria-label="Verified member" />}
              </p>
              {donor.email && (
                <p className="flex items-center gap-1 truncate text-xs text-sand-600">
                  <Mail className="size-3 shrink-0" aria-hidden />
                  {donor.email}
                </p>
              )}
              <p className="text-xs text-sand-600">
                {donor.memberSince ? `Member since ${formatDate(donor.memberSince)} · ` : ""}
                {donor.approvedCount} approved · {donor.rejectedCount} rejected
              </p>
            </div>
            {donor.rejectedCount > 0 && donor.rejectedCount >= donor.approvedCount && (
              <ShieldAlert className="size-5 shrink-0 text-saffron-600" aria-label="Several earlier listings were rejected" />
            )}
          </div>

          {error && (
            <div className="mt-4">
              <FormAlert>{error}</FormAlert>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row">
            <Button size="lg" className="w-full sm:flex-1" disabled={busy !== null} onClick={() => decide("approve")}>
              {busy === "approve" ? <Spinner /> : <Check className="size-5" aria-hidden />}
              Approve
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full text-red-700 hover:border-red-300 hover:bg-red-50 sm:flex-1"
              disabled={busy !== null}
              onClick={() => rejectRef.current?.showModal()}
            >
              <X className="size-5" aria-hidden />
              Reject…
            </Button>
          </div>
        </div>
      </div>

      <RejectDialog dialogRef={rejectRef} itemId={item.id} title={item.title} busy={busy === "reject"} error={error} onReject={(reason) => decide("reject", reason)} />
      {lightbox !== null && <Lightbox images={item.images} index={lightbox} onChange={setLightbox} title={item.title} />}
    </article>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-xs text-sand-500">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="truncate font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function RejectDialog({
  dialogRef,
  itemId,
  title,
  busy,
  error,
  onReject,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  itemId: string;
  title: string;
  busy: boolean;
  error?: string;
  onReject: (reason: string) => void;
}) {
  const [preset, setPreset] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const reason = [preset, details.trim()].filter(Boolean).join(" ").slice(0, 300);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`reject-${itemId}`}
      onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-xl rounded-4xl bg-cream-50 p-0 text-ink-800 shadow-lift backdrop:bg-ink-900/50 backdrop:backdrop-blur-sm open:animate-fade-up"
    >
      <form
        method="dialog"
        className="p-6 sm:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (reason) onReject(reason);
        }}
      >
        <h2 id={`reject-${itemId}`} className="font-display text-2xl font-semibold text-ink-900">
          Reject listing
        </h2>
        <p className="mt-1 text-sm text-sand-600">
          “{title}” — the donor sees this reason and can edit and resubmit.
        </p>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-ink-800">Reason</legend>
          <div className="mt-3 space-y-2">
            {REJECT_REASONS.map((r) => (
              <label
                key={r}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-2xl p-3 text-sm ring-1 transition",
                  preset === r ? "bg-red-50 ring-red-300" : "bg-white ring-ink-900/10 hover:ring-ink-900/25",
                )}
              >
                <input type="radio" name="reason" className="mt-0.5 accent-red-600" checked={preset === r} onChange={() => setPreset(r)} />
                {r}
              </label>
            ))}
          </div>
        </fieldset>

        <label htmlFor={`details-${itemId}`} className="mt-5 block text-sm font-semibold text-ink-800">
          {preset ? "Add details (optional)" : "Or write your own reason"}
        </label>
        <Textarea
          id={`details-${itemId}`}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          maxLength={300}
          className="mt-2"
          placeholder="e.g. Please add a photo of the back of the sofa."
        />
        <p className="mt-1 text-xs text-sand-500">{reason.length}/300</p>

        {error && (
          <div className="mt-4">
            <FormAlert>{error}</FormAlert>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => dialogRef.current?.close()}>
            Cancel
          </Button>
          <Button type="submit" disabled={!reason || busy} className="bg-red-600 shadow-none hover:bg-red-700 focus-visible:outline-red-600">
            {busy && <Spinner />}
            Reject listing
          </Button>
        </div>
      </form>
    </dialog>
  );
}

function Lightbox({ images, index, onChange, title }: { images: string[]; index: number; onChange: (i: number | null) => void; title: string }) {
  const go = (delta: number) => onChange((index + delta + images.length) % images.length);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — photo ${index + 1} of ${images.length}`}
      tabIndex={-1}
      ref={(el) => el?.focus()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onChange(null);
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      onClick={(e) => e.target === e.currentTarget && onChange(null)}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/90 p-4 outline-none"
    >
      <div className="relative h-[80vh] w-full max-w-5xl">
        <Image src={images[index]!} alt={`${title} — photo ${index + 1}`} fill sizes="100vw" className="object-contain" />
      </div>
      <button type="button" onClick={() => onChange(null)} aria-label="Close" className="absolute top-4 right-4 cursor-pointer rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
        <X className="size-5" />
      </button>
      {images.length > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-4 cursor-pointer rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
            <ChevronLeft className="size-6" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-4 cursor-pointer rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
            <ChevronRight className="size-6" />
          </button>
          <p className="absolute bottom-4 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
            {index + 1} / {images.length}
          </p>
        </>
      )}
      <a
        href={images[index]}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 left-4 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
      >
        Original <ExternalLink className="size-3.5" aria-hidden />
      </a>
    </div>
  );
}
