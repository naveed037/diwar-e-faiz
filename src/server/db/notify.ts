import "server-only";
import { FieldValue, type Transaction, type WriteBatch } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { adminDb } from "@/server/firebase/admin";
import type { NotificationDoc } from "@/types/firestore";

type NewNotification = Omit<NotificationDoc, "read" | "createdAt">;

/** Queues a notification inside an existing transaction or batch so it commits atomically with the change it describes. */
export function queueNotification(writer: Transaction | WriteBatch, userId: string, notification: NewNotification) {
  const ref = adminDb().collection(COLLECTIONS.users).doc(userId).collection(COLLECTIONS.notifications).doc();
  const doc: NotificationDoc = { ...notification, read: false, createdAt: FieldValue.serverTimestamp() };
  (writer as WriteBatch).set(ref, doc);
}
