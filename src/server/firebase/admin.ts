import "server-only";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getServerEnv } from "@/server/env";

/**
 * Firebase Admin SDK — bypasses security rules, so it must only ever run on the server.
 * `server-only` makes any accidental import from a Client Component a build error.
 */
const APP_NAME = "diwar-e-faiz-admin";

export function getAdminApp(): App {
  if (getApps().some((a) => a.name === APP_NAME)) return getApp(APP_NAME);

  const env = getServerEnv();
  return initializeApp(
    {
      projectId: env.FIREBASE_PROJECT_ID,
      storageBucket: env.FIREBASE_STORAGE_BUCKET,
      ...(env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY
        ? {
            credential: cert({
              projectId: env.FIREBASE_PROJECT_ID,
              clientEmail: env.FIREBASE_CLIENT_EMAIL,
              privateKey: env.FIREBASE_PRIVATE_KEY,
            }),
          }
        : {}),
    },
    APP_NAME,
  );
}

let settingsApplied = false;

export function adminDb() {
  const db = getFirestore(getAdminApp());
  if (!settingsApplied) {
    db.settings({ ignoreUndefinedProperties: true });
    settingsApplied = true;
  }
  return db;
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminBucket = () => getStorage(getAdminApp()).bucket();
