import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { getFirebaseConfig } from "./config";

/**
 * Lazily initialised Firebase client singletons.
 * - Nothing connects until a getter is first called, so the UI runs without credentials.
 * - getApps() guards against re-initialisation during hot reload.
 * - NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true points everything at the local emulator suite.
 */
const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === "true";
const connected = { auth: false, db: false, storage: false };

export function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(getFirebaseConfig());
}

export function getFirebaseAuth(): Auth {
  const auth = getAuth(getFirebaseApp());
  if (useEmulators && !connected.auth) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connected.auth = true;
  }
  return auth;
}

export function getDb(): Firestore {
  const db = getFirestore(getFirebaseApp());
  if (useEmulators && !connected.db) {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connected.db = true;
  }
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  const storage = getStorage(getFirebaseApp());
  if (useEmulators && !connected.storage) {
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    connected.storage = true;
  }
  return storage;
}
