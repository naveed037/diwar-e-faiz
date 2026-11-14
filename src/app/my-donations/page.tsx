import { HandHeart } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { MyDonationsDashboard } from "@/features/my-donations/components/my-donations-dashboard";
import { ProfileUnavailable } from "@/features/profile/components/profile-unavailable";
import { AppError } from "@/lib/errors";
import { getSessionUser } from "@/server/auth/session";
import { listMyDonations } from "@/server/db/donations";
import { CATEGORIES } from "@/constants/categories";

export const metadata: Metadata = { title: "My donations", robots: { index: false } };

export default function MyDonationsPage({ searchParams }: PageProps<"/my-donations">) {
  return (
    <Container className="pt-8 pb-20">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "My donations" }]} />
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink-900">My donations</h1>
          <p className="mt-2 text-sand-600">Manage your listings, update their status and see who has asked for them.</p>
        </div>
        <ButtonLink href="/donate" size="lg">
          <HandHeart className="size-5" aria-hidden />
          Donate something
        </ButtonLink>
      </div>
      <div className="mt-10">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-4xl bg-white" />}>
          <DashboardContent highlight={searchParams.then((p) => (typeof p.created === "string" ? p.created : typeof p.updated === "string" ? p.updated : null))} />
        </Suspense>
      </div>
    </Container>
  );
}

async function DashboardContent({ highlight }: { highlight: Promise<string | null> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/my-donations");
  let donations;
  try {
    // Query is scoped to the verified session uid — never to an ID from the request.
    donations = await listMyDonations(user.uid);
  } catch (error) {
    if (error instanceof AppError && error.code === "not-configured") return <ProfileUnavailable />;
    throw error;
  }
  return <MyDonationsDashboard donations={donations} categories={CATEGORIES} highlightId={await highlight} />;
}
