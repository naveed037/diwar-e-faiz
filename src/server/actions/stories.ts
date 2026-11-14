"use server";

import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { AppError, type ActionResult } from "@/lib/errors";
import { submitStorySchema } from "@/lib/validation/schemas";
import { requireUser } from "@/server/auth/session";
import { adminDb } from "@/server/firebase/admin";
import type { SuccessStoryDoc, UserDoc } from "@/types/firestore";
import { runAction } from "./run-action";

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Users submit stories; they stay private until an admin publishes them. */
export async function submitStory(input: unknown): Promise<ActionResult<{ storyId: string }>> {
  return runAction(submitStorySchema, input, async ({ donationId, quote, role, city, itemLabel }) => {
    const user = await requireUser();
    const db = adminDb();
    const userSnap = await db.collection(COLLECTIONS.users).doc(user.uid).get();
    if (!userSnap.exists) throw new AppError("failed-precondition", "Please complete your profile first.");
    const { displayName } = userSnap.data() as UserDoc;

    const ref = db.collection(COLLECTIONS.successStories).doc();
    const doc: SuccessStoryDoc = {
      authorId: user.uid,
      donationId: donationId ?? null,
      quote,
      displayName,
      initials: initialsOf(displayName),
      role,
      city,
      itemLabel,
      status: "pending",
      featured: false,
      createdAt: FieldValue.serverTimestamp(),
      publishedAt: null,
    };
    await ref.create(doc);
    return { storyId: ref.id };
  });
}
