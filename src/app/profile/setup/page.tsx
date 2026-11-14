import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { ProfileUnavailable } from "@/features/profile/components/profile-unavailable";
import { AppError } from "@/lib/errors";
import { getSessionUser } from "@/server/auth/session";
import { userRef } from "@/server/db/users";

export const metadata: Metadata = { title: "Set up your profile", robots: { index: false } };

export default function ProfileSetupPage({ searchParams }: PageProps<"/profile/setup">) {
  return (
    <Container className="max-w-2xl py-12 sm:py-16">
      <p className="text-xs font-bold tracking-[0.18em] text-faiz-600 uppercase">Almost there</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-900">Set up your profile</h1>
      <p className="mt-3 text-sand-600">
        Tell your neighbours a little about you. You can give and receive with the same account — no need to pick a role.
      </p>
      <div className="mt-10 rounded-4xl bg-white p-6 ring-1 ring-ink-900/5 sm:p-10">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-cream-100" />}>
          <SetupContent next={searchParams.then((p) => (typeof p.next === "string" ? p.next : null))} />
        </Suspense>
      </div>
    </Container>
  );
}

async function SetupContent({ next }: { next: Promise<string | null> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/profile/setup");

  try {
    if ((await userRef(user.uid).get()).exists) redirect("/profile");
  } catch (error) {
    if (error instanceof AppError && error.code === "not-configured") return <ProfileUnavailable />;
    throw error;
  }

  return (
    <ProfileForm
      mode="setup"
      next={await next}
      initial={{ displayName: user.name ?? "", city: "", area: "", phone: "", bio: "", photoURL: user.picture }}
    />
  );
}
