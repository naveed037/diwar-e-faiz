"use server";

import { z } from "zod";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { ActionResult } from "@/lib/errors";
import { markNotificationsReadSchema } from "@/lib/validation/schemas";
import { requireUser } from "@/server/auth/session";
import { adminDb } from "@/server/firebase/admin";
import { runAction } from "./run-action";

/** Ownership is structural: we only ever touch users/{currentUid}/notifications/*. */
export async function markNotificationsRead(input: unknown): Promise<ActionResult> {
  return runAction(markNotificationsReadSchema, input, async ({ notificationIds }) => {
    const user = await requireUser({ verifiedEmail: false });
    const col = adminDb().collection(COLLECTIONS.users).doc(user.uid).collection(COLLECTIONS.notifications);
    const batch = adminDb().batch();
    const snaps = await adminDb().getAll(...notificationIds.map((id) => col.doc(id)));
    for (const snap of snaps) if (snap.exists) batch.update(snap.ref, { read: true });
    await batch.commit();
  });
}

export async function markAllNotificationsRead(): Promise<ActionResult<{ updated: number }>> {
  return runAction(z.undefined(), undefined, async () => {
    const user = await requireUser({ verifiedEmail: false });
    const unread = await adminDb()
      .collection(COLLECTIONS.users)
      .doc(user.uid)
      .collection(COLLECTIONS.notifications)
      .where("read", "==", false)
      .limit(400)
      .get();
    const batch = adminDb().batch();
    unread.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
    return { updated: unread.size };
  });
}
