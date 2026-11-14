"use client";

import { CheckCheck, Clock3, Pencil, RotateCcw, Trash2, Undo2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/features/auth/components/auth-bits";
import type { ActionResult } from "@/lib/errors";
import { deleteDonation, removeDonation, setDonationStatus } from "@/server/actions/donations";
import type { OwnerDonation } from "@/server/db/donations";
import { displayStatus } from "../lib/display-status";

/** Owner controls for a single listing. Every action is re-authorised on the server. */
export function ListingActions({ donation }: { donation: OwnerDonation }) {
  const router = useRouter();
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const status = displayStatus(donation);
  const canDelete = donation.applicationCount === 0 && donation.status !== "given";

  async function run(key: string, action: () => Promise<ActionResult<unknown>>, success: string) {
    setBusy(key);
    const result = await action();
    setBusy(null);
    if (!result.ok) return toast(result.message, "info");
    toast(success);
    startTransition(() => router.refresh());
  }

  const id = donation.id;
  const icon = (key: string, Icon: typeof Pencil) => (busy === key ? <Spinner /> : <Icon className="size-4" aria-hidden />);

  return (
    <div className="flex flex-wrap gap-2">
      {(status === "live" || status === "reserved" || status === "review" || status === "changes") && (
        <ButtonLink href={`/my-donations/${id}/edit`} variant="outline" size="sm">
          <Pencil className="size-4" aria-hidden />
          {status === "changes" ? "Edit & resubmit" : "Edit"}
        </ButtonLink>
      )}

      {status === "live" && (
        <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => run("reserve", () => setDonationStatus({ donationId: id, status: "reserved" }), "Marked as reserved.")}>
          {icon("reserve", Clock3)}
          Mark reserved
        </Button>
      )}

      {status === "reserved" && (
        <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => run("available", () => setDonationStatus({ donationId: id, status: "available" }), "Available again.")}>
          {icon("available", Undo2)}
          Make available
        </Button>
      )}

      {(status === "live" || status === "reserved") && (
        <Button
          size="sm"
          disabled={!!busy}
          onClick={async () => {
            const ok = await confirm({
              title: "Mark as given away?",
              body: "This closes the listing and counts it in your giving history. It can't be undone.",
              confirmLabel: "Yes, it's been given",
            });
            if (ok) await run("given", () => setDonationStatus({ donationId: id, status: "given" }), "Wonderful — marked as given. JazakAllah!");
          }}
        >
          {icon("given", CheckCheck)}
          Mark given
        </Button>
      )}

      {status === "removed" && (
        <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => run("relist", () => setDonationStatus({ donationId: id, status: "relist" }), "Relisted — it will be reviewed before going live.")}>
          {icon("relist", RotateCcw)}
          Relist
        </Button>
      )}

      {status !== "given" && status !== "removed" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={!!busy}
          onClick={async () => {
            const ok = await confirm({
              title: "Remove this listing?",
              body: "It will be hidden from everyone else and any open requests will be declined. You can relist it later.",
              confirmLabel: "Remove listing",
              tone: "danger",
            });
            if (ok) await run("remove", () => removeDonation({ donationId: id }), "Listing removed.");
          }}
        >
          {icon("remove", XCircle)}
          Remove
        </Button>
      )}

      {canDelete && (status === "review" || status === "changes" || status === "removed" || status === "live") && (
        <Button
          size="sm"
          variant="ghost"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          disabled={!!busy}
          onClick={async () => {
            const ok = await confirm({
              title: "Delete permanently?",
              body: "The listing and its photos will be deleted forever. This can't be undone.",
              confirmLabel: "Delete forever",
              tone: "danger",
            });
            if (ok) await run("delete", () => deleteDonation({ donationId: id }), "Listing deleted.");
          }}
        >
          {icon("delete", Trash2)}
          Delete
        </Button>
      )}

      {dialog}
    </div>
  );
}
