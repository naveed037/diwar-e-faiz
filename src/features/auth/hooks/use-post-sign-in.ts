"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { getProfileStatus } from "@/server/actions/users";
import { safeNext } from "../lib/auth-client";

/** After any sign-in: new accounts (e.g. first Google login) go to profile setup, others to `next`. */
export function usePostSignIn(next: string | null) {
  const router = useRouter();
  return useCallback(async () => {
    const target = safeNext(next);
    const status = await getProfileStatus();
    const needsSetup = status.ok && status.data.signedIn && !status.data.hasProfile;
    router.replace(needsSetup ? `/profile/setup?next=${encodeURIComponent(target)}` : target);
    router.refresh();
  }, [next, router]);
}
