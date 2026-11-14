/**
 * End-to-end authentication workflow against the Firebase Auth emulator and a running Next.js server.
 *
 *   1. npm run firebase:emulators            (or: firebase emulators:start --only auth --project demo-diwar-e-faiz)
 *   2. build & start the app with emulator env (see README → Testing)
 *   3. E2E_BASE_URL=http://localhost:3100 npx vitest run tests/e2e
 *
 * Covers: registration, session cookie issuance and attributes, CSRF/origin checks, protected routes,
 * sign-out, token revocation, disabled accounts, Google sign-in, email verification and password reset.
 */
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const EMU = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099"}`;
const PROJECT = process.env.FIREBASE_PROJECT_ID ?? "demo-diwar-e-faiz";
const IDT = `${EMU}/identitytoolkit.googleapis.com/v1`;

let app: App;
let admin: Auth;

async function idt<T = Record<string, string>>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${IDT}/${path}?key=fake-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as T & { error?: { message: string } };
  if (!res.ok) throw new Error(`${path}: ${json.error?.message}`);
  return json;
}

const signUp = (email: string, password: string) =>
  idt<{ idToken: string; localId: string }>("accounts:signUp", { email, password, returnSecureToken: true });
const signIn = (email: string, password: string) =>
  idt<{ idToken: string; localId: string }>("accounts:signInWithPassword", { email, password, returnSecureToken: true });

async function createSession(idToken: string, cookie?: string) {
  return fetch(`${BASE}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify({ idToken }),
  });
}

function sessionCookie(res: Response) {
  const raw = res.headers.get("set-cookie") ?? "";
  const value = /__session=([^;]*)/.exec(raw)?.[1] ?? "";
  return { raw, value, header: `__session=${value}` };
}

async function serverUid(cookie?: string) {
  const res = await fetch(`${BASE}/api/auth/session`, { headers: cookie ? { Cookie: cookie } : {} });
  return ((await res.json()) as { uid: string | null }).uid;
}

const unique = () => `user${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`;

beforeAll(async () => {
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
  app = initializeApp({ projectId: PROJECT }, `e2e-${Date.now()}`);
  admin = getAuth(app);
  const ready = await fetch(`${EMU}/`).catch(() => null);
  if (!ready?.ok) throw new Error(`Auth emulator not reachable at ${EMU}`);
  const site = await fetch(`${BASE}/`).catch(() => null);
  if (!site?.ok) throw new Error(`App not reachable at ${BASE}`);
});

afterAll(async () => {
  if (app) await deleteApp(app);
});

describe("email registration → session", () => {
  it("issues an httpOnly, SameSite=Lax session cookie for a fresh sign-up", async () => {
    const { idToken, localId } = await signUp(unique(), "kindness123");
    const res = await createSession(idToken);
    expect(res.status).toBe(200);
    const cookie = sessionCookie(res);
    expect(cookie.value.length).toBeGreaterThan(100);
    expect(cookie.raw).toMatch(/HttpOnly/i);
    expect(cookie.raw).toMatch(/SameSite=lax/i);
    expect(cookie.raw).toMatch(/Path=\//);
    expect(await serverUid(cookie.header)).toBe(localId);
  });

  it("rejects requests without a same-site Origin (CSRF)", async () => {
    const { idToken } = await signUp(unique(), "kindness123");
    const noOrigin = await fetch(`${BASE}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const evil = await fetch(`${BASE}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
      body: JSON.stringify({ idToken }),
    });
    expect(noOrigin.status).toBe(403);
    expect(evil.status).toBe(403);
    expect(noOrigin.headers.get("set-cookie")).toBeNull();
  });

  it("rejects forged or tampered ID tokens", async () => {
    const { idToken } = await signUp(unique(), "kindness123");
    const [h, p] = idToken.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p!, "base64url").toString()), sub: "someone-else", user_id: "someone-else" })).toString("base64url");
    expect((await createSession(`${h}.${forgedPayload}.sig`)).status).toBe(401);
    expect((await createSession("x".repeat(40))).status).toBe(401);
  });

  it("does not accept a session cookie value that was tampered with", async () => {
    const { idToken } = await signUp(unique(), "kindness123");
    const { value } = sessionCookie(await createSession(idToken));
    expect(await serverUid(`__session=${value.slice(0, -4)}AAAA`)).toBeNull();
    expect(await serverUid("__session=garbage")).toBeNull();
  });
});

describe("email/password login", () => {
  it("signs in an existing user and creates a session", async () => {
    const email = unique();
    const { localId } = await signUp(email, "kindness123");
    const { idToken } = await signIn(email, "kindness123");
    const res = await createSession(idToken);
    expect(res.status).toBe(200);
    expect(await serverUid(sessionCookie(res).header)).toBe(localId);
  });

  it("refuses wrong passwords at Firebase Auth", async () => {
    const email = unique();
    await signUp(email, "kindness123");
    await expect(signIn(email, "wrong-password1")).rejects.toThrow(/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD/);
  });
});

describe("protected routes", () => {
  it.each(["/profile", "/donate", "/my-donations", "/my-donations/abc/edit"])("redirects %s to login without a session", async (path) => {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`/login?next=${encodeURIComponent(path)}`);
  });

  it("lets a signed-in user past the proxy", async () => {
    const { idToken } = await signUp(unique(), "kindness123");
    const cookie = sessionCookie(await createSession(idToken)).header;
    const res = await fetch(`${BASE}/my-donations`, { redirect: "manual", headers: { Cookie: cookie } });
    expect(res.status).not.toBe(307);
  });
});

describe("logout and revocation", () => {
  it("clears the cookie on sign-out", async () => {
    const { idToken } = await signUp(unique(), "kindness123");
    const cookie = sessionCookie(await createSession(idToken)).header;
    const res = await fetch(`${BASE}/api/auth/session`, { method: "DELETE", headers: { Origin: BASE, Cookie: cookie } });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/__session=;.*(Max-Age=0|Expires=Thu, 01 Jan 1970)/i);
  });

  it("invalidates existing sessions when tokens are revoked (e.g. password change, admin action)", async () => {
    const { idToken, localId } = await signUp(unique(), "kindness123");
    const cookie = sessionCookie(await createSession(idToken)).header;
    expect(await serverUid(cookie)).toBe(localId);
    await new Promise((r) => setTimeout(r, 1100)); // revocation has 1-second granularity
    await admin.revokeRefreshTokens(localId);
    expect(await serverUid(cookie)).toBeNull();
  });

  it("locks out disabled accounts immediately", async () => {
    const { idToken, localId } = await signUp(unique(), "kindness123");
    const cookie = sessionCookie(await createSession(idToken)).header;
    await admin.updateUser(localId, { disabled: true });
    expect(await serverUid(cookie)).toBeNull();
  });
});

describe("Google sign-in", () => {
  it("creates a session for a Google account with verified email, name and photo", async () => {
    const email = unique();
    const fakeGoogleToken = JSON.stringify({
      sub: `google-${Date.now()}`,
      email,
      email_verified: true,
      name: "Ayesha Khan",
      picture: "https://lh3.googleusercontent.com/a/test",
    });
    const { idToken, localId } = await idt<{ idToken: string; localId: string }>("accounts:signInWithIdp", {
      postBody: `providerId=google.com&id_token=${encodeURIComponent(fakeGoogleToken)}`,
      requestUri: "http://localhost",
      returnSecureToken: true,
    });
    const res = await createSession(idToken);
    expect(res.status).toBe(200);
    const claims = await admin.verifySessionCookie(sessionCookie(res).value, true);
    expect(claims.uid).toBe(localId);
    expect(claims.email_verified).toBe(true);
    expect(claims.name).toBe("Ayesha Khan");
    expect(claims.firebase.sign_in_provider).toBe("google.com");
  });
});

describe("email verification", () => {
  it("refreshes an existing session so the server sees email_verified", async () => {
    const email = unique();
    const { idToken } = await signUp(email, "kindness123");
    const first = sessionCookie(await createSession(idToken));
    expect((await admin.verifySessionCookie(first.value)).email_verified).toBe(false);

    await idt("accounts:sendOobCode", { requestType: "VERIFY_EMAIL", idToken });
    const { oobCodes } = (await (await fetch(`${EMU}/emulator/v1/projects/${PROJECT}/oobCodes`)).json()) as {
      oobCodes: { email: string; oobCode: string; requestType: string }[];
    };
    const code = oobCodes.find((c) => c.email === email && c.requestType === "VERIFY_EMAIL")!;
    await idt("accounts:update", { oobCode: code.oobCode });

    const { idToken: fresh } = await signIn(email, "kindness123");
    const refreshed = sessionCookie(await createSession(fresh, first.header));
    expect((await admin.verifySessionCookie(refreshed.value)).email_verified).toBe(true);
  });
});

describe("forgot password", () => {
  it("sends a reset code, resets the password, and old password stops working", async () => {
    const email = unique();
    await signUp(email, "kindness123");
    await idt("accounts:sendOobCode", { requestType: "PASSWORD_RESET", email });
    const { oobCodes } = (await (await fetch(`${EMU}/emulator/v1/projects/${PROJECT}/oobCodes`)).json()) as {
      oobCodes: { email: string; oobCode: string; requestType: string }[];
    };
    const code = oobCodes.reverse().find((c) => c.email === email && c.requestType === "PASSWORD_RESET")!;
    expect(code).toBeDefined();
    await idt("accounts:resetPassword", { oobCode: code.oobCode, newPassword: "newKindness456" });
    await expect(signIn(email, "kindness123")).rejects.toThrow();
    expect((await signIn(email, "newKindness456")).idToken).toBeTruthy();
  });
});
