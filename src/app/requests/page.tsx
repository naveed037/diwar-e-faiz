import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { SentRequests } from "@/features/requests/components/sent-requests";
import { getSessionUser } from "@/server/auth/session";
import { listMyRequests } from "@/server/db/requests";

export const metadata: Metadata = { title: "My requests", robots: { index: false } };

export default function MyRequestsPage() {
  return (
    <Container className="max-w-3xl pt-8 pb-20">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "My requests" }]} />
      <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight text-ink-900">My requests</h1>
      <p className="mt-2 text-sand-600">Items you&apos;ve asked for and what each donor decided.</p>
      <div className="mt-8">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-4xl bg-white" />}>
          <RequestsContent />
        </Suspense>
      </div>
    </Container>
  );
}

async function RequestsContent() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/requests");
  return <SentRequests requests={await listMyRequests(user.uid)} />;
}
