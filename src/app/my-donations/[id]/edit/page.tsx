import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { DonateForm } from "@/features/donate/components/donate-form";
import { getSessionUser } from "@/server/auth/session";
import { getMyDonation } from "@/server/db/donations";
import { CATEGORIES } from "@/constants/categories";

export const metadata: Metadata = { title: "Edit listing", robots: { index: false } };

export default function EditDonationPage({ params }: PageProps<"/my-donations/[id]/edit">) {
  return (
    <Container className="max-w-4xl pt-8 pb-20">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "My donations", href: "/my-donations" }, { label: "Edit listing" }]} />
      <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight text-ink-900">Edit listing</h1>
      <div className="mt-8">
        <Suspense fallback={<div className="h-[48rem] animate-pulse rounded-4xl bg-white" />}>
          <EditContent id={params.then((p) => p.id)} />
        </Suspense>
      </div>
    </Container>
  );
}

async function EditContent({ id }: { id: Promise<string> }) {
  const user = await getSessionUser();
  const donationId = await id;
  if (!user) redirect(`/login?next=/my-donations/${encodeURIComponent(donationId)}/edit`);

  // Ownership is enforced here (and again in the server action). Non-owners get a plain 404.
  const donation = await getMyDonation(user.uid, donationId);
  if (!donation) notFound();

  if (donation.status === "given" || donation.status === "removed") {
    return (
      <div className="rounded-4xl bg-white p-8 text-center ring-1 ring-ink-900/5">
        <p className="font-semibold text-ink-900">
          This listing is {donation.status === "given" ? "already given away" : "removed"} and can&apos;t be edited.
        </p>
        <ButtonLink href="/my-donations" variant="outline" className="mt-6">
          Back to my donations
        </ButtonLink>
      </div>
    );
  }

  return (
    <DonateForm
      mode="edit"
      uid={user.uid}
      donationId={donation.id}
      categories={CATEGORIES}
      initialImages={donation.images}
      initial={{
        title: donation.title,
        categoryId: donation.categoryId,
        description: donation.description,
        condition: donation.condition,
        city: donation.city,
        area: donation.area,
        pickupPreference: donation.pickupPreference,
        notes: donation.notes,
      }}
    />
  );
}
