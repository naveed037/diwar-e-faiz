import { BadgeCheck, CalendarDays, Gift, HandHeart, MapPin, PackageCheck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SignOutButton, VerifyEmailBanner } from "@/features/profile/components/account-actions";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { ProfileUnavailable } from "@/features/profile/components/profile-unavailable";
import { AppError } from "@/lib/errors";
import { formatDate } from "@/lib/utils/format";
import { getSessionUser } from "@/server/auth/session";
import { getOwnProfile, type OwnProfile } from "@/server/db/users";

export const metadata: Metadata = { title: "My profile", robots: { index: false } };

export default function ProfilePage({ searchParams }: PageProps<"/profile">) {
  return (
    <Container className="pt-8 pb-20">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "My profile" }]} />
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent welcome={searchParams.then((p) => p.welcome === "1")} />
      </Suspense>
    </Container>
  );
}

async function loadProfile() {
  // Identity comes ONLY from the verified session cookie — never from the URL or a form.
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/profile");
  try {
    return { user, profile: await getOwnProfile(user.uid) };
  } catch (error) {
    if (error instanceof AppError && error.code === "not-configured") return { user, profile: "unavailable" as const };
    throw error;
  }
}

async function ProfileContent({ welcome }: { welcome: Promise<boolean> }) {
  const [{ user, profile }, isWelcome] = await Promise.all([loadProfile(), welcome]);
  if (profile === "unavailable") return <div className="mt-10"><ProfileUnavailable /></div>;
  if (!profile) redirect("/profile/setup");

  return (
    <div className="mt-8 space-y-6">
      {isWelcome && (
        <div className="rounded-3xl bg-faiz-700 p-6 text-cream-50 sm:p-8">
          <p className="font-display text-2xl font-semibold">Welcome to Diwar-e-Faiz, {profile.displayName.split(" ")[0]}!</p>
          <p className="mt-1 text-cream-50/80">Your account can both give and receive. Add a photo and a short introduction to build trust.</p>
        </div>
      )}
      {!user.emailVerified && <VerifyEmailBanner email={profile.email} />}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <ProfileSummary profile={profile} emailVerified={user.emailVerified} />
        <section aria-labelledby="edit-heading" className="rounded-4xl bg-white p-6 ring-1 ring-ink-900/5 sm:p-10">
          <h1 id="edit-heading" className="font-display text-2xl font-semibold text-ink-900">
            Edit profile
          </h1>
          <p className="mt-1 mb-8 text-sm text-sand-600">Keep your details up to date so donors and recipients can find you.</p>
          <ProfileForm
            mode="edit"
            initial={{
              displayName: profile.displayName,
              city: profile.city ?? "",
              area: profile.area ?? "",
              phone: profile.phone ? profile.phone.replace(/^\+92/, "0") : "",
              bio: profile.bio,
              photoURL: profile.photoURL,
            }}
          />
        </section>
      </div>
    </div>
  );
}

function ProfileSummary({ profile, emailVerified }: { profile: OwnProfile; emailVerified: boolean }) {
  const initials = profile.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <aside className="h-fit space-y-5 rounded-4xl bg-white p-6 ring-1 ring-ink-900/5 lg:sticky lg:top-24">
      <div className="flex flex-col items-center text-center">
        <div className="relative size-24 overflow-hidden rounded-full ring-4 ring-cream-200">
          {profile.photoURL ? (
            <Image src={profile.photoURL} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <Avatar initials={initials || "?"} className="size-full text-2xl" />
          )}
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-lg font-semibold text-ink-900">
          {profile.displayName}
          {profile.verified && <BadgeCheck className="size-5 text-faiz-600" aria-label="Verified member" />}
        </p>
        {profile.city && (
          <p className="mt-1 flex items-center gap-1 text-sm text-sand-600">
            <MapPin className="size-3.5" aria-hidden />
            {[profile.area, profile.city].filter(Boolean).join(", ")}
          </p>
        )}
        {profile.memberSince && (
          <p className="mt-1 flex items-center gap-1 text-xs text-sand-500">
            <CalendarDays className="size-3.5" aria-hidden />
            Member since {formatDate(profile.memberSince)}
          </p>
        )}
        {profile.bio && <p className="mt-4 text-sm leading-relaxed text-ink-700">{profile.bio}</p>}
      </div>

      <dl className="grid grid-cols-2 gap-3">
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

      <div className="space-y-1 rounded-2xl bg-cream-100 p-4 text-sm">
        <p className="text-xs font-medium text-sand-500">Account email (private)</p>
        <p className="break-all font-medium text-ink-900">{profile.email}</p>
        <p className={emailVerified ? "text-xs font-semibold text-faiz-700" : "text-xs font-semibold text-saffron-600"}>
          {emailVerified ? "Verified" : "Not verified yet"}
        </p>
      </div>

      <div className="grid gap-2">
        <ButtonLink href="/donate">
          <HandHeart className="size-4" aria-hidden />
          Donate something
        </ButtonLink>
        <ButtonLink href="/my-donations" variant="secondary">
          My donations
        </ButtonLink>
        <ButtonLink href="/donations" variant="outline">
          Find something
        </ButtonLink>
        <SignOutButton />
      </div>
    </aside>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-hidden className="mt-8 grid animate-pulse gap-6 lg:grid-cols-[340px_1fr]">
      <div className="h-[30rem] rounded-4xl bg-white" />
      <div className="h-[36rem] rounded-4xl bg-white" />
    </div>
  );
}
