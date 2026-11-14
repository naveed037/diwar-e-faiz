/**
 * Who can open /admin/moderation — over HTTP against the running app (Auth + Firestore emulators).
 * Admin rights come only from the `admin` custom claim, set here with the Admin SDK.
 */
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const EMU = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099"}`;
const PROJECT = process.env.FIREBASE_PROJECT_ID ?? "demo-diwar-e-faiz";
const RUN = `a${Date.now().toString(36)}`;

let app: App;
let auth: Auth;

async function sessionFor(email: string, claims?: Record<string, unknown>) {
  const res = await fetch(`${EMU}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "kindness123", returnSecureToken: true }),
  });
  const { localId } = (await res.json()) as { localId: string };
  await auth.updateUser(localId, { emailVerified: true });
  if (claims) await auth.setCustomUserClaims(localId, claims);
  // Sign in again so the ID token carries the claims and verified email.
  const signIn = await fetch(`${EMU}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "kindness123", returnSecureToken: true }),
  });
  const { idToken } = (await signIn.json()) as { idToken: string };
  const session = await fetch(`${BASE}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ idToken }),
  });
  return `__session=${/__session=([^;]*)/.exec(session.headers.get("set-cookie") ?? "")?.[1]}`;
}

const html = (cookie?: string) =>
  fetch(`${BASE}/admin/moderation`, { redirect: "manual", headers: cookie ? { Cookie: cookie } : {} }).then(async (r) => ({
    status: r.status,
    location: r.headers.get("location"),
    body: await r.text(),
  }));

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080");
  app = initializeApp({ projectId: PROJECT }, `admin-${RUN}`);
  auth = getAuth(app);
  const db = getFirestore(app);
  await db.collection("users").doc(`d${RUN}`).set({ displayName: "Queue Donor", photoURL: null, verified: false, createdAt: Timestamp.now() });
  await db.collection("donations").doc(`${RUN}-pending`).set({
    donorId: `d${RUN}`,
    donor: { displayName: "Queue Donor", photoURL: null, verified: false },
    title: `${RUN} waiting listing`,
    description: "Waiting for an admin.",
    categoryId: "books",
    condition: "good",
    status: "available",
    moderation: { state: "pending", reason: null, reviewedBy: null, reviewedAt: null },
    city: "Lahore",
    area: "Johar Town",
    pickupPreference: "either",
    notes: "",
    keywords: [],
    images: [],
    applicationCount: 0,
    reservedFor: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    givenAt: null,
  });
});

afterAll(async () => {
  if (app) await deleteApp(app);
});

describe("/admin/moderation access", () => {
  it("redirects signed-out visitors to login", async () => {
    const res = await html();
    expect(res.status).toBe(307);
    expect(res.location).toBe("/login?next=%2Fadmin%2Fmoderation");
  });

  it("shows a plain not-found page to signed-in non-admins (no queue data)", async () => {
    const res = await html(await sessionFor(`user-${RUN}@example.com`));
    expect(res.body).toContain("This page has moved on");
    expect(res.body).not.toContain("Listing moderation");
    expect(res.body).not.toContain(`${RUN} waiting listing`);
  });

  it("does not trust look-alike claims", async () => {
    const res = await html(await sessionFor(`fake-${RUN}@example.com`, { role: "admin", admin: "true" }));
    expect(res.body).not.toContain(`${RUN} waiting listing`);
  });

  it("shows the queue to admins", async () => {
    const res = await html(await sessionFor(`admin-${RUN}@example.com`, { admin: true }));
    expect(res.body).toContain("Listing moderation");
    expect(res.body).toContain(`${RUN} waiting listing`);
  });
});
