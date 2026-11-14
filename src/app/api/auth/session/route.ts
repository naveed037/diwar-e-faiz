import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { SESSION_COOKIE, createSessionCookie, getSessionUser } from "@/server/auth/session";

/**
 * POST   /api/auth/session  { idToken }  → sets the httpOnly session cookie after a fresh sign-in
 * DELETE /api/auth/session              → clears it (sign out)
 */

/** Cookie-setting endpoints must only accept same-origin requests (CSRF protection). */
function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const bodySchema = z.object({ idToken: z.string().min(20).max(4096) });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const current = await getSessionUser();
    const { value, maxAge } = await createSessionCookie(parsed.data.idToken, current?.uid);
    (await cookies()).set(SESSION_COOKIE, value, {
      maxAge,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AppError && error.code === "not-configured") {
      console.error("[auth/session]", error.message);
      return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 });
    }
    return NextResponse.json({ error: "Your sign-in has expired. Please sign in again." }, { status: 401 });
  }
}

/** GET → { uid } of the verified server session (or null). Used to keep client and server sign-in state in sync. */
export async function GET() {
  try {
    const user = await getSessionUser();
    return NextResponse.json({ uid: user?.uid ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ uid: null }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
