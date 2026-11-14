import { describe, expect, it } from "vitest";
import { DEFAULT_MESSAGES, firebaseErrorMessage } from "@/lib/errors";
import { safeNext } from "@/features/auth/lib/auth-client";

describe("safeNext (open-redirect protection)", () => {
  it("allows same-site relative paths", () => {
    expect(safeNext("/donate")).toBe("/donate");
    expect(safeNext("/donations?category=books")).toBe("/donations?category=books");
  });

  it.each(["https://evil.example", "//evil.example", "javascript:alert(1)", "", null, undefined])(
    "falls back for %s",
    (value) => {
      expect(safeNext(value)).toBe("/profile");
    },
  );
});

describe("firebaseErrorMessage", () => {
  it("never reveals whether an email exists on failed sign-in", () => {
    expect(firebaseErrorMessage({ code: "auth/user-not-found" })).toBe(firebaseErrorMessage({ code: "auth/wrong-password" }));
  });

  it("maps known codes and falls back for unknown ones", () => {
    expect(firebaseErrorMessage({ code: "auth/email-already-in-use" })).toMatch(/already exists/);
    expect(firebaseErrorMessage({ code: "something/else" })).toBe(DEFAULT_MESSAGES.internal);
    expect(firebaseErrorMessage(new Error("boom"))).toBe(DEFAULT_MESSAGES.internal);
  });
});
