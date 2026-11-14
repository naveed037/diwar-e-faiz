import { Camera, HandHeart, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { DonateForm } from "@/features/donate/components/donate-form";
import { VerifyEmailBanner } from "@/features/profile/components/account-actions";
import { ProfileUnavailable } from "@/features/profile/components/profile-unavailable";
import { AppError } from "@/lib/errors";
import { getSessionUser } from "@/server/auth/session";
import { getOwnProfile } from "@/server/db/users";
import { CATEGORIES } from "@/constants/categories";

export const metadata: Metadata = {
  title: "Donate Something",
  description: "Post an item you no longer need and give it, free, to someone nearby who does.",
};

const TIPS = [
  { icon: Camera, title: "Good photos matter", body: "Use daylight and show any wear honestly. The first photo becomes the cover." },
  { icon: HandHeart, title: "You choose who receives", body: "Read requests and pick the person it would help most." },
  { icon: ShieldCheck, title: "Your privacy is protected", body: "Only your city and area are public. Contact details go to the person you approve." },
];

export default function DonatePage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Donate something" }]}
        eyebrow="Give in under two minutes"
        title="Donate something"
        urdu="اپنی اضافی چیز عطیہ کریں"
        description="Tell us about the item and where it can be collected. We'll help it reach someone nearby who needs it — always free."
      />
      <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_320px] lg:gap-12">
        <Suspense fallback={<div className="h-[48rem] animate-pulse rounded-4xl bg-white" />}>
          <DonateContent />
        </Suspense>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {TIPS.map((t) => (
            <div key={t.title} className="flex gap-4 rounded-3xl bg-cream-50 p-5 ring-1 ring-ink-900/5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-faiz-50 text-faiz-700">
                <t.icon className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold text-ink-900">{t.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-sand-600">{t.body}</p>
              </div>
            </div>
          ))}
        </aside>
      </Container>
    </>
  );
}

async function DonateContent() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/donate");

  let profile;
  try {
    profile = await getOwnProfile(user.uid);
  } catch (error) {
    if (error instanceof AppError && error.code === "not-configured") return <ProfileUnavailable />;
    throw error;
  }
  if (!profile) redirect("/profile/setup?next=/donate");
  if (!user.emailVerified) return <VerifyEmailBanner email={profile.email} />;

  return (
    <DonateForm
      mode="create"
      uid={user.uid}
      categories={CATEGORIES}
      initial={{ city: profile.city ?? "", area: profile.area ?? "" }}
    />
  );
}
