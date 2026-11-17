"use client";

import { Check, Gift, Inbox, MapPin, MessageCircle, Phone, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { FormAlert, Spinner } from "@/features/auth/components/auth-bits";
import { DonorAvatar } from "@/features/donations/components/donor-avatar";
import { formatDateTime } from "@/lib/utils/format";
import { decideApplication } from "@/server/actions/applications";
import { setDonationStatus } from "@/server/actions/donations";
import type { ReceivedRequest } from "@/server/db/requests";
import type { ListingStatus } from "@/types/firestore";
import { FOR_WHOM_LABEL } from "../lib/labels";
import { RequestStatusBadge } from "./request-status-badge";

type Listing = { id: string; title: string; status: ListingStatus; approved: boolean };

/** Donor's inbox for one listing: read each request, accept one (reserves the item, opens a chat) or decline. */
export function ReceivedRequests({ listing, requests }: { listing: Listing; requests: ReceivedRequest[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  const canAccept = listing.approved && listing.status === "available";
  const active = requests.filter((r) => r.status !== "withdrawn");

  async function decide(r: ReceivedRequest, decision: "accept" | "decline") {
    const ok = await confirm(
      decision === "accept"
        ? {
            title: `Give “${listing.title}” to ${r.applicant.displayName}?`,
            body: "The item will be marked Reserved for them, you'll see their phone number, and a private chat opens so you can arrange the handover. Other requests stay open until you answer them.",
            confirmLabel: "Accept request",
          }
        : {
            title: `Decline ${r.applicant.displayName}'s request?`,
            body: "They'll be told politely that you chose someone else. This can't be undone.",
            confirmLabel: "Decline",
            tone: "danger",
          },
    );
    if (!ok) return;
    setBusy(r.id + decision);
    setError(undefined);
    const result = await decideApplication({ applicationId: r.id, decision });
    setBusy(null);
    if (!result.ok) return setError(result.message);
    toast(decision === "accept" ? `Accepted — say salaam to ${r.applicant.displayName} in Messages.` : "Request declined.");
    router.refresh();
  }

  async function markGiven(r: ReceivedRequest) {
    const ok = await confirm({
      title: "Mark as given?",
      body: `Confirm that ${r.applicant.displayName} has received “${listing.title}”. The listing closes and this can't be undone.`,
      confirmLabel: "Yes, it's been given",
    });
    if (!ok) return;
    setBusy(r.id + "given");
    setError(undefined);
    const result = await setDonationStatus({ donationId: listing.id, status: "given" });
    setBusy(null);
    if (!result.ok) return setError(result.message);
    toast("JazakAllah! The listing is marked as given.");
    router.refresh();
  }

  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink-900/15 bg-white/60 px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-faiz-50 text-faiz-700">
          <Inbox className="size-7" aria-hidden />
        </span>
        <h2 className="mt-5 font-display text-xl font-semibold text-ink-900">No requests yet</h2>
        <p className="mt-2 max-w-sm text-sm text-sand-600">
          When someone asks for this item, their request appears here and you get a notification.
        </p>
        <ButtonLink href={`/donations/${listing.id}`} variant="outline" className="mt-6">
          View the listing
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dialog}
      {error && <FormAlert>{error}</FormAlert>}
      {!canAccept && listing.status === "reserved" && (
        <FormAlert tone="info">This item is reserved. To choose someone else, make it available again from My donations.</FormAlert>
      )}
      {listing.status === "given" && <FormAlert tone="info">This item has been given away. Thank you for sharing!</FormAlert>}
      {!listing.approved && <FormAlert tone="info">You can accept requests once the listing is approved.</FormAlert>}

      <ul className="space-y-4">
        {active.map((r) => (
          <li key={r.id} className="rounded-3xl bg-white p-5 ring-1 ring-ink-900/5 sm:p-6">
            <div className="flex items-start gap-4">
              <Link href={`/users/${r.applicant.uid}`} className="shrink-0">
                <DonorAvatar name={r.applicant.displayName} photoURL={r.applicant.photoURL} size={48} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link href={`/users/${r.applicant.uid}`} className="font-semibold text-ink-900 hover:underline">
                    {r.applicant.displayName}
                  </Link>
                  <RequestStatusBadge status={r.status} />
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-sand-600">
                  {r.applicant.city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden />
                      {[r.applicant.area, r.applicant.city].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span>{FOR_WHOM_LABEL[r.forWhom]}</span>
                  {r.createdAt && <span>{formatDateTime(r.createdAt)}</span>}
                </p>
              </div>
            </div>

            <p className="mt-4 rounded-2xl bg-cream-100 px-4 py-3 text-[15px] leading-relaxed whitespace-pre-line text-ink-800">{r.message}</p>

            {(r.status === "accepted" || r.status === "completed") && (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-faiz-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="inline-flex items-center gap-2 text-sm text-faiz-800">
                  <Phone className="size-4" aria-hidden />
                  {r.phone ? (
                    <a href={`tel:${r.phone}`} className="font-semibold hover:underline">
                      {r.phone}
                    </a>
                  ) : (
                    "No phone number shared — use Messages."
                  )}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <ButtonLink href={`/messages/${r.id}`} size="sm">
                    <MessageCircle className="size-4" aria-hidden />
                    Open chat
                  </ButtonLink>
                  {r.status === "accepted" && listing.status === "reserved" && (
                    <Button size="sm" variant="outline" onClick={() => markGiven(r)} disabled={busy !== null}>
                      {busy === r.id + "given" ? <Spinner /> : <Gift className="size-4" aria-hidden />}
                      Mark as given
                    </Button>
                  )}
                </div>
              </div>
            )}

            {r.status === "pending" && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => decide(r, "decline")} disabled={busy !== null} className="w-full sm:w-auto">
                  {busy === r.id + "decline" ? <Spinner /> : <X className="size-4" aria-hidden />}
                  Decline
                </Button>
                <Button onClick={() => decide(r, "accept")} disabled={busy !== null || !canAccept} className="w-full sm:w-auto">
                  {busy === r.id + "accept" ? <Spinner /> : <Check className="size-4" aria-hidden />}
                  Accept
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
