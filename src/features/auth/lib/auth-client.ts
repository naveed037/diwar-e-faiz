"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { firebaseErrorMessage } from "@/lib/errors";
import { getFirebaseAuth } from "@/lib/firebase/client";

/**
 * Client-side auth flows. Firebase Auth verifies credentials; we then exchange the fresh ID token
 * for an httpOnly session cookie so server actions can trust who the user is.
 */

export class AuthFlowError extends Error {}

async function establishSession(user: User) {
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    await firebaseSignOut(getFirebaseAuth());
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new AuthFlowError(body?.error ?? "We couldn't sign you in. Please try again.");
  }
}

function wrap<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((error: unknown) => {
    if (error instanceof AuthFlowError) throw error;
    throw new AuthFlowError(firebaseErrorMessage(error));
  });
}

export function signInWithEmail(email: string, password: string) {
  return wrap(async () => {
    const { user } = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    await establishSession(user);
    return user;
  });
}

export function registerWithEmail(email: string, password: string, displayName: string) {
  return wrap(async () => {
    const { user } = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    await updateProfile(user, { displayName });
    await establishSession(user);
    // Verification email failure shouldn't block registration; the profile page offers a resend.
    await sendEmailVerification(user, { url: `${window.location.origin}/profile` }).catch(() => undefined);
    return user;
  });
}

export function signInWithGoogle() {
  return wrap(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const { user } = await signInWithPopup(getFirebaseAuth(), provider);
    await establishSession(user);
    return user;
  });
}

export function requestPasswordReset(email: string) {
  return wrap(() => sendPasswordResetEmail(getFirebaseAuth(), email, { url: `${window.location.origin}/login` }));
}

export function resendVerificationEmail() {
  return wrap(async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new AuthFlowError("Please sign in again.");
    await sendEmailVerification(user, { url: `${window.location.origin}/profile` });
  });
}

/** After the user clicks the email link, refresh the token so the server session sees `email_verified`. */
export function refreshSessionAfterVerification() {
  return wrap(async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new AuthFlowError("Please sign in again.");
    await user.reload();
    if (!user.emailVerified) throw new AuthFlowError("Your email isn't verified yet — click the link in the email we sent.");
    await establishSession(user);
  });
}

export async function signOut() {
  await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
  await firebaseSignOut(getFirebaseAuth()).catch(() => undefined);
}

/** Only allow same-site relative redirects after login (prevents open-redirect abuse). */
export function safeNext(next: string | null | undefined, fallback = "/profile") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
