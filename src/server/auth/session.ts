import "server-only";
import { cookies } from "next/headers";
import { AppError } from "@/lib/errors";
import { adminAuth } from "@/server/firebase/admin";

export const SESSION_COOKIE = "__session"; // the only cookie name Firebase Hosting forwards to the server
const SESSION_DAYS = 5;
const MAX_SIGN_IN_AGE_SECONDS = 5 * 60;

export type SessionUser = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
  /** Set only via the Admin SDK (scripts/set-admin.ts). Never derived from client input. */
  isAdmin: boolean;
};

/**
 * Exchanges a Firebase ID token for an httpOnly session cookie value.
 * Requires a recent sign-in, unless the caller already holds a valid session for the same user
 * (e.g. refreshing claims after email verification).
 */
export async function createSessionCookie(idToken: string, currentSessionUid?: string | null) {
  const decoded = await adminAuth().verifyIdToken(idToken, true);
  const isRefresh = currentSessionUid === decoded.uid;
  if (!isRefresh && Date.now() / 1000 - decoded.auth_time > MAX_SIGN_IN_AGE_SECONDS) {
    throw new AppError("unauthenticated", "Please sign in again.");
  }
  const expiresIn = SESSION_DAYS * 24 * 60 * 60 * 1000;
  const value = await adminAuth().createSessionCookie(idToken, { expiresIn });
  return { value, maxAge: expiresIn / 1000 };
}

/** Returns the signed-in user, or null. Checks revocation so disabled accounts lose access immediately. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    const claims = await adminAuth().verifySessionCookie(value, true);
    return {
      uid: claims.uid,
      email: claims.email ?? null,
      emailVerified: claims.email_verified === true,
      name: typeof claims.name === "string" ? claims.name : null,
      picture: typeof claims.picture === "string" ? claims.picture : null,
      isAdmin: claims.admin === true,
    };
  } catch {
    return null;
  }
}

export async function requireUser({ verifiedEmail = true }: { verifiedEmail?: boolean } = {}): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AppError("unauthenticated", "Please sign in to continue.");
  if (verifiedEmail && !user.emailVerified) {
    throw new AppError("email-not-verified", "Please verify your email address first — check your inbox for the link.");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin) throw new AppError("forbidden", "You don't have permission to do that.");
  return user;
}
