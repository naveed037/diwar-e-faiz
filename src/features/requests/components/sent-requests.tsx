"use client";

import { MessageCircle, PackageSearch, Undo2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { FormAlert, Spinner } from "@/features/auth/components/auth-bits";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";
import { withdrawApplication } from "@/server/actions/applications";
import type { SentRequest } from "@/server/db/requests";
import { MY_FOR_WHOM_LABEL } from "../lib/labels";
import { RequestStatusBadge } from "./request-status-badge";

const HELP: Record<SentRequest["status"], string> = {
  pending: "The donor hasn't replied yet. You'll get a notification when they do.",
  accepted: "The donor chose you! Open the chat to arrange pickup or delivery.",
  completed: "The donor marked this as given to you. Enjoy it!",
  declined: "The donor gave this to someone else. New items arrive every day.",
  withdrawn: "You withdrew this request.",
};

type Filter = "active" | "all";

export function SentRequests({ requests }: { requests: SentRequest[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState<Filter>("active");

  const activeCount = requests.filter((r) => r.status === "pending" || r.status === "accepted").length;
  const shown = filter === "active" ? requests.filter((r) => r.status === "pending" || r.status === "accepted") : requests;

  async function withdraw(r: SentRequest) {
    const ok = await confirm({
      title: "Withdraw your request?",
      body:
        r.status === "accepted"
          ? `The donor reserved “${r.title}” for you. Withdrawing releases it for someone else and closes your chat.`
          : `The donor will be told you no longer need “${r.title}”.`,
      confirmLabel: "Withdraw",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(r.id);
    setError(undefined);
    const result = await withdrawApplication({ applicationId: r.id });
    setBusy(null);
    if (!result.ok) return setError(result.message);
    toast("Request withdrawn.");
    router.refresh();
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink-900/15 bg-white/60 px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-faiz-50 text-faiz-700">
          <PackageSearch className="size-7" aria-hidden />
        </span>
        <h2 className="mt-5 font-display text-xl font-semibold text-ink-900">You haven&apos;t requested anything yet</h2>
        <p className="mt-2 max-w-sm text-sm text-sand-600">Find something you need and send the donor a short note.</p>
        <ButtonLink href="/donations" className="mt-6">
          Browse donations
        </ButtonLink>
      </div>
    );
  }

  return (
    <div>
      {dialog}
      <div className="flex gap-2" role="tablist" aria-label="Filter requests">
        {(
          [
            ["active", `Active (${activeCount})`],
            ["all", `All (${requests.length})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "cursor-pointer rounded-full px-4 py-2 text-sm font-medium ring-1 transition",
              filter === value ? "bg-faiz-700 text-cream-50 ring-faiz-700" : "bg-white text-ink-700 ring-ink-900/10 hover:ring-ink-900/25",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4">
          <FormAlert>{error}</FormAlert>
        </div>
      )}

      {shown.length === 0 ? (
        <p className="mt-8 rounded-3xl bg-white px-6 py-10 text-center text-sm text-sand-600 ring-1 ring-ink-900/5">
          No active requests. Switch to <strong>All</strong> to see past ones.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {shown.map((r) => (
            <li key={r.id} className="rounded-3xl bg-white p-4 ring-1 ring-ink-900/5 sm:p-5">
              <div className="flex gap-4">
                <Link href={`/donations/${r.donationId}`} className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-cream-200 sm:size-24">
                  {r.image && <Image src={r.image} alt="" fill sizes="96px" className="object-cover" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link href={`/donations/${r.donationId}`} className="font-semibold text-ink-900 hover:underline">
                      {r.title}
                    </Link>
                    <RequestStatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-xs text-sand-600">
                    Donor:{" "}
                    <Link href={`/users/${r.donor.uid}`} className="font-medium text-ink-700 hover:underline">
                      {r.donor.displayName}
                    </Link>
                    {r.donor.city && ` · ${r.donor.city}`} · {MY_FOR_WHOM_LABEL[r.forWhom]}
                    {r.createdAt && ` · Sent ${formatDateTime(r.createdAt)}`}
                  </p>
                  <p className="mt-2 text-sm text-sand-600">{HELP[r.status]}</p>
                </div>
              </div>

              {(r.status === "pending" || r.status === "accepted" || r.status === "completed") && (
                <div className="mt-4 flex flex-col gap-2 border-t border-ink-900/5 pt-4 sm:flex-row sm:justify-end">
                  {(r.status === "pending" || r.status === "accepted") && (
                    <Button variant="ghost" size="sm" onClick={() => withdraw(r)} disabled={busy !== null} className="w-full sm:w-auto">
                      {busy === r.id ? <Spinner /> : <Undo2 className="size-4" aria-hidden />}
                      Withdraw
                    </Button>
                  )}
                  {(r.status === "accepted" || r.status === "completed") && (
                    <ButtonLink href={`/messages/${r.id}`} size="sm" className="w-full sm:w-auto">
                      <MessageCircle className="size-4" aria-hidden />
                      Open chat
                    </ButtonLink>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
