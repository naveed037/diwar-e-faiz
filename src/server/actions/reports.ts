"use server";

import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, reportId as makeReportId } from "@/lib/firebase/collections";
import { AppError, type ActionResult } from "@/lib/errors";
import { createReportSchema } from "@/lib/validation/schemas";
import { requireUser } from "@/server/auth/session";
import { adminDb } from "@/server/firebase/admin";
import type { ConversationDoc, ReportDoc } from "@/types/firestore";
import { runAction } from "./run-action";

/**
 * Report a donation, user or message. Message targets use "conversationId/messageId" and may only be
 * reported by a participant of that conversation. One report per person per target.
 */
export async function createReport(input: unknown): Promise<ActionResult<{ reportId: string }>> {
  return runAction(createReportSchema, input, async ({ targetType, targetId, reason, details }) => {
    const user = await requireUser({ verifiedEmail: false });
    const db = adminDb();

    if (targetType === "donation") {
      if (!(await db.collection(COLLECTIONS.donations).doc(targetId).get()).exists) throw new AppError("not-found", "Item not found.");
    } else if (targetType === "user") {
      if (targetId === user.uid) throw new AppError("invalid-input", "You can't report yourself.");
      if (!(await db.collection(COLLECTIONS.users).doc(targetId).get()).exists) throw new AppError("not-found", "User not found.");
    } else {
      const [conversationId, messageId] = targetId.split("/");
      if (!conversationId || !messageId) throw new AppError("invalid-input", "Invalid message reference.");
      const convRef = db.collection(COLLECTIONS.conversations).doc(conversationId);
      const [conv, msg] = await Promise.all([convRef.get(), convRef.collection(COLLECTIONS.messages).doc(messageId).get()]);
      if (!conv.exists || !msg.exists || !(conv.data() as ConversationDoc).participantIds.includes(user.uid)) {
        throw new AppError("not-found", "Message not found.");
      }
    }

    // Document IDs cannot contain "/", so message targets are encoded.
    const id = makeReportId(user.uid, targetType, targetId.replace("/", "~"));
    const now = FieldValue.serverTimestamp();
    const doc: ReportDoc = {
      reporterId: user.uid,
      targetType,
      targetId,
      reason,
      details,
      status: "open",
      resolution: null,
      resolvedBy: null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db.collection(COLLECTIONS.reports).doc(id).create(doc);
    } catch (error) {
      if ((error as { code?: number }).code === 6) throw new AppError("conflict", "You've already reported this. Our team is reviewing it.");
      throw error;
    }
    return { reportId: id };
  });
}
