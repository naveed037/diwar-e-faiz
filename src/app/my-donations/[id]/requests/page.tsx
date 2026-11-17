import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { ReceivedRequests } from "@/features/requests/components/received-requests";
import { getSessionUser } from "@/server/auth/session";
import { getMyDonation } from "@/server/db/donations";
import { listRequestsForDonation } from "@/server/db/requests";

export const metadata: Metadata = { title: "Requests for your item", robots: { index: false } };

export default function ListingRequestsPage({ params }: PageProps<"/my-donations/[id]/requests">) {
  return (
    <Container className="max-w-3xl pt-8 pb-20">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "My donations", href: "/my-donations" }, { label: "Requests" }]} />
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-4xl bg-white" />}>
        <RequestsContent id={params.then((p) => p.id)} />
      </Suspense>
    </Container>
  );
}

async function RequestsContent({ id }: { id: Promise<string> }) {
  const user = await getSessionUser();
  const donationId = await id;
  if (!user) redirect(`/login?next=/my-donations/${encodeURIComponent(donationId)}/requests`);

  // Only the owner may see who asked for an item; everyone else gets a plain 404.
  const donation = await getMyDonation(user.uid, donationId);
  if (!donation) notFound();
  const requests = await listRequestsForDonation(user.uid, donation.id);
  const cover = donation.images[0]?.url;

  return (
    <>
      <div className="mt-8 flex items-center gap-4">
        {cover && (
          <Link href={`/donations/${donation.id}`} className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-cream-200 sm:size-20">
            <Image src={cover} alt="" fill sizes="80px" className="object-cover" />
          </Link>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-faiz-700">Requests for</p>
          <h1 className="truncate font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">{donation.title}</h1>
        </div>
      </div>
      <p className="mt-4 text-sand-600">
        Read each note and choose who to give it to. Accepting reserves the item for that person and opens a private chat.
      </p>
      <div className="mt-8">
        <ReceivedRequests
          listing={{ id: donation.id, title: donation.title, status: donation.status, approved: donation.moderation.state === "approved" }}
          requests={requests}
        />
      </div>
    </>
  );
}
