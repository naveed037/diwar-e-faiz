"use client";

import { onIdTokenChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";

export type AuthUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  emailVerified: boolean;
};

type AuthStatus = "loading" | "signed-in" | "signed-out" | "unconfigured";
type AuthContextValue = { status: AuthStatus; user: AuthUser | null; refresh: () => Promise<void> };

const AuthContext = createContext<AuthContextValue | null>(null);

const toAuthUser = (u: User): AuthUser => ({
  uid: u.uid,
  displayName: u.displayName,
  email: u.email,
  photoURL: u.photoURL,
  emailVerified: u.emailVerified,
});

/**
 * Tracks the Firebase Auth user for UI purposes (navbar, menus). Authorisation never relies on this:
 * the server re-verifies the httpOnly session cookie on every protected request.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(isFirebaseConfigured ? "loading" : "unconfigured");
  const [user, setUser] = useState<AuthUser | null>(null);
  const initialSyncDone = useRef(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const auth = getFirebaseAuth();

    return onIdTokenChanged(auth, async (fbUser) => {
      // On first load, a user restored from browser storage must also have a valid server session.
      // If the cookie expired or was revoked, sign the browser out too so both sides agree.
      if (!initialSyncDone.current) {
        initialSyncDone.current = true;
        if (fbUser) {
          const res = await fetch("/api/auth/session", { cache: "no-store" }).catch(() => null);
          const server = res?.ok ? ((await res.json()) as { uid: string | null }) : null;
          if (server && server.uid !== fbUser.uid) {
            await firebaseSignOut(auth);
            return;
          }
        }
      }
      setUser(fbUser ? toAuthUser(fbUser) : null);
      setStatus(fbUser ? "signed-in" : "signed-out");
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    const current = getFirebaseAuth().currentUser;
    if (!current) return;
    await current.reload();
    setUser(toAuthUser(current));
  }, []);

  const value = useMemo(() => ({ status, user, refresh }), [status, user, refresh]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
