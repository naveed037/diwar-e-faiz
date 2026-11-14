"use server";

import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { AppError, type ActionResult } from "@/lib/errors";
import { conversationIdSchema, sendMessageSchema } from "@/lib/validation/schemas";
import { requireUser } from "@/server/auth/session";
import { queueNotification } from "@/server/db/notify";
import { adminDb } from "@/server/firebase/admin";
import type { ApplicationDoc, ConversationDoc, MessageDoc } from "@/types/firestore";
import { runAction } from "./run-action";

/**
 * Messages are written by the server so every message is validated and the conversation summary
 * (last message, unread counts) stays consistent. Clients only *read* messages in real time.
 */
export async function sendMessage(input: unknown): Promise<ActionResult<{ messageId: string }>> {
  return runAction(sendMessageSchema, input, async ({ conversationId, text }) => {
    const user = await requireUser();
    const db = adminDb();
    const convRef = db.collection(COLLECTIONS.conversations).doc(conversationId);
    const msgRef = convRef.collection(COLLECTIONS.messages).doc();

    await db.runTransaction(async (tx) => {
      const convSnap = await tx.get(convRef);
      if (!convSnap.exists) throw new AppError("not-found", "Conversation not found.");
      const conv = convSnap.data() as ConversationDoc;
      if (!conv.participantIds.includes(user.uid)) throw new AppError("forbidden", "You're not part of this conversation.");

      const appSnap = await tx.get(db.collection(COLLECTIONS.applications).doc(conv.applicationId));
      const status = (appSnap.data() as ApplicationDoc | undefined)?.status;
      if (status !== "accepted" && status !== "completed") {
        throw new AppError("failed-precondition", "This conversation is closed.");
      }

      const recipient = conv.participantIds.find((id) => id !== user.uid)!;
      const now = FieldValue.serverTimestamp();
      const message: MessageDoc = { senderId: user.uid, text, createdAt: now };
      tx.create(msgRef, message);
      tx.update(convRef, {
        lastMessage: { text: text.slice(0, 140), senderId: user.uid, sentAt: now },
        [`unread.${recipient}`]: FieldValue.increment(1),
        updatedAt: now,
      });
      // Notify only on the first unread message to avoid flooding the recipient.
      if ((conv.unread?.[recipient] ?? 0) === 0) {
        queueNotification(tx, recipient, {
          type: "message",
          title: "New message",
          body: `About “${conv.donationTitle}”: ${text.slice(0, 80)}`,
          link: `/messages/${conversationId}`,
          actorId: user.uid,
        });
      }
    });

    return { messageId: msgRef.id };
  });
}

export async function markConversationRead(input: unknown): Promise<ActionResult> {
  return runAction(conversationIdSchema, input, async ({ conversationId }) => {
    const user = await requireUser();
    const convRef = adminDb().collection(COLLECTIONS.conversations).doc(conversationId);
    const snap = await convRef.get();
    if (!snap.exists || !(snap.data() as ConversationDoc).participantIds.includes(user.uid)) {
      throw new AppError("not-found", "Conversation not found.");
    }
    await convRef.update({ [`unread.${user.uid}`]: 0 });
  });
}
