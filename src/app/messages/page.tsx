import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { ConversationList } from "@/features/messages/components/conversation-list";
import { getSessionUser } from "@/server/auth/session";
import { listMyConversations } from "@/server/db/requests";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default function MessagesPage() {
  return (
    <Container className="max-w-3xl pt-8 pb-20">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Messages" }]} />
      <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight text-ink-900">Messages</h1>
      <p className="mt-2 text-sand-600">Private chats with donors and people you&apos;re giving to.</p>
      <div className="mt-8">
        <Suspense fallback={<div className="h-80 animate-pulse rounded-4xl bg-white" />}>
          <MessagesContent />
        </Suspense>
      </div>
    </Container>
  );
}

async function MessagesContent() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/messages");
  return <ConversationList conversations={await listMyConversations(user.uid)} />;
}
