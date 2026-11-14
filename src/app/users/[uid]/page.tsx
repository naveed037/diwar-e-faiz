import { BadgeCheck, CalendarDays, Gift, MapPin, PackageCheck, PackageOpen } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { DonationGrid } from "@/features/donations/components/donation-grid";
import { DonorAvatar } from "@/features/donations/components/donor-avatar";
import { formatDate } from "@/lib/utils/format";
import { getDonorDonations, getPublicProfile } from "@/server/db/public";

export async function generateMetadata({ params }: PageProps<"/users/[uid]">): Promise<Metadata> {
  const profile = await getPublicProfile((await params).uid);
  return profile
    ? { title: `${profile.displayName} · Donor profile`, description: profile.bio || `${profile.displayName} gives on Diwar-e-Faiz.` }
    : { title: "Profile not found" };
}

export default function PublicProfilePage({ params }: PageProps<"/users/[uid]">) {
  return (
    <Container className="pt-8 pb-20">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Browse", href: "/donations" }, { label: "Donor profile" }]} />
      <Suspense fallback={<div aria-hidden className="mt-8 h-72 animate-pulse rounded-4xl bg-white" />}>
        <ProfileContent uid={params.then((p) => p.uid)} />
      </Suspense>
    </Container>
  );
}

async function ProfileContent({ uid }: { uid: Promise<string> }) {
  const id = await uid;
  const [profile, donations] = await Promise.all([getPublicProfile(id), getDonorDonations(id)]);
  if (!profile) notFound();
  const firstName = profile.displayName.split(" ")[0];

  return (
    <>
      {/* Only public fields are rendered. Email, phone and preferences live in a private subcollection. */}
      <section className="relative mt-8 overflow-hidden rounded-4xl bg-white p-6 ring-1 ring-ink-900/5 sm:p-10">
        <div aria-hidden className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-faiz-100 via-cream-200 to-saffron-100" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end">
          <DonorAvatar name={profile.displayName} photoURL={profile.photoURL} size={112} className="size-28 text-3xl ring-4 ring-white" />
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              {profile.displayName}
              {profile.verified && <BadgeCheck className="size-6 text-faiz-600" aria-label="Verified member" />}
            </h1>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-sand-600">
              {profile.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-4" aria-hidden />
                  {[profile.area, profile.city].filter(Boolean).join(", ")}
                </span>
              )}
              {profile.memberSince && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-4" aria-hidden />
                  Member since {formatDate(profile.memberSince)}
                </span>
              )}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:w-72">
            <div className="rounded-2xl bg-faiz-50 p-4 text-center">
              <dt className="flex items-center justify-center gap-1 text-xs font-medium text-faiz-700">
                <Gift className="size-3.5" aria-hidden /> Given
              </dt>
              <dd className="mt-1 font-display text-2xl font-semibold text-ink-900">{profile.stats.donated}</dd>
            </div>
            <div className="rounded-2xl bg-saffron-100 p-4 text-center">
              <dt className="flex items-center justify-center gap-1 text-xs font-medium text-saffron-600">
                <PackageCheck className="size-3.5" aria-hidden /> Received
              </dt>
              <dd className="mt-1 font-display text-2xl font-semibold text-ink-900">{profile.stats.received}</dd>
            </div>
          </dl>
        </div>
        {profile.bio && <p className="relative mt-6 max-w-2xl leading-relaxed text-ink-700">{profile.bio}</p>}
      </section>

      <section aria-labelledby="donor-items" className="mt-12">
        <h2 id="donor-items" className="font-display text-2xl font-semibold text-ink-900">
          Available from {firstName}
        </h2>
        <div className="mt-6">
          {donations.length > 0 ? (
            <DonationGrid donations={donations} />
          ) : (
            <div className="flex flex-col items-center rounded-4xl border border-dashed border-ink-900/15 bg-white/60 px-6 py-14 text-center">
              <PackageOpen className="size-8 text-sand-400" aria-hidden />
              <p className="mt-4 font-semibold text-ink-900">{firstName} has nothing available right now.</p>
              <ButtonLink href="/donations" variant="outline" className="mt-6">
                Browse all donations
              </ButtonLink>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
