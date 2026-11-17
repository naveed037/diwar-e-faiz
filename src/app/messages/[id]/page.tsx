import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { ChatThread } from "@/features/messages/components/chat-thread";
import { getSessionUser } from "@/server/auth/session";
import { getConversation } from "@/server/db/requests";

export const metadata: Metadata = { title: "Chat", robots: { index: false } };

export default function ChatPage({ params }: PageProps<"/messages/[id]">) {
  return (
    <Container className="max-w-3xl pt-6 pb-10">
      <Suspense fallback={<div className="h-[calc(100dvh-10rem)] min-h-[28rem] animate-pulse rounded-4xl bg-white" />}>
        <ChatContent id={params.then((p) => p.id)} />
      </Suspense>
    </Container>
  );
}

async function ChatContent({ id }: { id: Promise<string> }) {
  const user = await getSessionUser();
  const conversationId = await id;
  if (!user) redirect(`/login?next=/messages/${encodeURIComponent(conversationId)}`);
  // Only the two participants can open a conversation; anyone else gets a plain 404.
  const conversation = await getConversation(user.uid, conversationId);
  if (!conversation) notFound();
  return <ChatThread conversation={conversation} myUid={user.uid} />;
}
