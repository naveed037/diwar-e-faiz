/**
 * Error model shared by server actions and client code.
 * Server actions never throw to the client: they return an ActionResult so the UI can show
 * field errors and friendly messages, while internal details stay in server logs.
 */

export type ErrorCode =
  | "unauthenticated"
  | "email-not-verified"
  | "forbidden"
  | "not-found"
  | "invalid-input"
  | "conflict"
  | "failed-precondition"
  | "rate-limited"
  | "not-configured"
  | "internal";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; fieldErrors?: Record<string, string[] | undefined> };

export const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  unauthenticated: "Please sign in to continue.",
  "email-not-verified": "Please verify your email address first — check your inbox for the link.",
  forbidden: "You don't have permission to do that.",
  "not-found": "We couldn't find what you were looking for.",
  "invalid-input": "Please check the highlighted fields.",
  conflict: "This has already been done.",
  "failed-precondition": "This action isn't possible right now.",
  "rate-limited": "You're doing that too often. Please wait a moment.",
  "not-configured": "This feature isn't available yet. Please try again later.",
  internal: "Something went wrong on our side. Please try again.",
};

/** Maps Firebase client SDK error codes (auth/*, storage/*, firestore) to messages people understand. */
const FIREBASE_CLIENT_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/user-disabled": "This account has been suspended. Contact us if you think this is a mistake.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
  "auth/weak-password": "Please choose a stronger password (at least 8 characters).",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "Network problem — check your connection and try again.",
  "auth/requires-recent-login": "For your security, please sign in again.",
  "auth/user-not-found": "Email or password is incorrect.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/missing-email": "Please enter your email address.",
  "storage/unauthorized": "Upload was blocked. Photos must be images of 200 KB or less.",
  "storage/canceled": "Upload was cancelled.",
  "storage/quota-exceeded": "Storage is temporarily full. Please try again later.",
  "storage/retry-limit-exceeded": "Upload timed out — check your connection and try again.",
  "permission-denied": "You don't have permission to do that.",
  unavailable: "We can't reach the server right now. Check your connection.",
};

export function firebaseErrorMessage(error: unknown, fallback = DEFAULT_MESSAGES.internal): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  return FIREBASE_CLIENT_MESSAGES[code] ?? fallback;
}
