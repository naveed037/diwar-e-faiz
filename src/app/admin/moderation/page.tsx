import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { ModerationQueue } from "@/features/admin/components/moderation-queue";
import { getSessionUser } from "@/server/auth/session";
import { listPendingDonations, listRecentlyReviewed } from "@/server/db/admin";

export const metadata: Metadata = { title: "Moderation", robots: { index: false, follow: false } };

export default function ModerationPage() {
  return (
    <Container className="pt-8 pb-20">
      <Suspense fallback={<QueueSkeleton />}>
        <ModerationContent />
      </Suspense>
    </Container>
  );
}

async function ModerationContent() {
  // Authorisation is decided on the server from the verified session cookie's `admin` custom claim.
  // Non-admins get a plain 404 so the page's existence isn't revealed.
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin/moderation");
  if (!user.isAdmin) notFound();

  const [{ items, total }, recent] = await Promise.all([listPendingDonations(), listRecentlyReviewed()]);

  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Admin" }, { label: "Moderation" }]} />
      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-faiz-600 uppercase">
            <ShieldCheck className="size-4" aria-hidden />
            Admin
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink-900">Listing moderation</h1>
          <p className="mt-2 max-w-2xl text-sand-600">
            Check that each item is free, allowed, honestly described and has no personal contact details. Approved listings go live
            immediately; rejected donors see your reason and can resubmit.
          </p>
        </div>
      </div>
      <div className="mt-10">
        <ModerationQueue pending={items} total={total} recent={recent} />
      </div>
    </>
  );
}

function QueueSkeleton() {
  return (
    <div aria-hidden className="animate-pulse space-y-6">
      <div className="h-24 w-2/3 rounded-3xl bg-white" />
      <div className="h-96 rounded-4xl bg-white" />
    </div>
  );
}
