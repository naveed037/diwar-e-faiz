import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  applySchema,
  completeRegistrationSchema,
  createDonationSchema,
  setDonationStatusSchema,
  pkMobile,
  profileSchema,
  registerSchema,
} from "@/lib/validation/schemas";

const fieldErrors = (r: { success: boolean; error?: z.ZodError }): Record<string, string[] | undefined> =>
  r.success ? {} : z.flattenError(r.error!).fieldErrors;

describe("pkMobile", () => {
  it.each([
    ["0300 1234567", "+923001234567"],
    ["03001234567", "+923001234567"],
    ["+92 321-7654321", "+923217654321"],
  ])("normalises %s", (input, expected) => {
    expect(pkMobile.parse(input)).toBe(expected);
  });

  it.each(["12345", "0421234567", "+44 7700 900123", "0300123456"])("rejects %s", (input) => {
    expect(pkMobile.safeParse(input).success).toBe(false);
  });
});

describe("registration", () => {
  const valid = {
    displayName: "Ayesha Khan",
    email: "ayesha@example.com",
    password: "kindness123",
    city: "Lahore",
    area: "Gulberg III",
    phone: "",
    bio: "",
  };

  it("accepts a valid registration with optional phone left empty", () => {
    const r = registerSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data?.phone).toBeNull();
  });

  it("requires a strong-enough password", () => {
    expect(fieldErrors(registerSchema.safeParse({ ...valid, password: "short" })).password).toBeDefined();
    expect(fieldErrors(registerSchema.safeParse({ ...valid, password: "onlyletters" })).password).toBeDefined();
    expect(fieldErrors(registerSchema.safeParse({ ...valid, password: "12345678" })).password).toBeDefined();
  });

  it("rejects unknown cities, bad emails and missing area", () => {
    const errors = fieldErrors(registerSchema.safeParse({ ...valid, city: "Atlantis", email: "nope", area: "" }));
    expect(errors.city).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.area).toBeDefined();
  });

  it("has no role field — every account can donate and request", () => {
    expect(Object.keys(completeRegistrationSchema.shape)).not.toContain("role");
    const r = completeRegistrationSchema.safeParse({ ...valid, role: "admin" });
    expect(r.success).toBe(true);
    expect(r.data).not.toHaveProperty("role");
  });
});

describe("profile updates", () => {
  const base = { displayName: "Ayesha Khan", city: "Karachi", area: "PECHS", phone: "", bio: "Teacher." };

  it("strips fields the user must never set (verified, stats, email)", () => {
    const r = profileSchema.safeParse({ ...base, verified: true, stats: { donated: 999 }, email: "x@y.z" });
    expect(r.success).toBe(true);
    expect(r.data).not.toHaveProperty("verified");
    expect(r.data).not.toHaveProperty("stats");
    expect(r.data).not.toHaveProperty("email");
  });

  it("only accepts avatar paths inside a users/{uid}/avatar folder", () => {
    expect(profileSchema.safeParse({ ...base, photoPath: "users/abc123/avatar/1.jpg" }).success).toBe(true);
    expect(profileSchema.safeParse({ ...base, photoPath: "users/abc123/../other/avatar/1.jpg" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, photoPath: "donations/abc/x/1.jpg" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, photoPath: null }).success).toBe(true);
  });

  it("limits the introduction to 300 characters", () => {
    expect(profileSchema.safeParse({ ...base, bio: "a".repeat(301) }).success).toBe(false);
  });
});

describe("donations and requests", () => {
  const donation = {
    donationId: "abc123",
    title: "Winter jackets",
    description: "Three warm jackets for kids aged 6 to 10.",
    categoryId: "clothing",
    condition: "good",
    city: "Lahore",
    area: "Model Town",
    pickupPreference: "delivery",
    notes: "Available after 6 pm.",
    imagePaths: ["donations/uid1/abc123/1.jpg"],
  };

  it("accepts a valid donation", () => {
    expect(createDonationSchema.safeParse(donation).success).toBe(true);
  });

  it("never stores a price: unknown fields like price are stripped", () => {
    const r = createDonationSchema.safeParse({ ...donation, price: 5000, amount: "100" });
    expect(r.success).toBe(true);
    expect(r.data).not.toHaveProperty("price");
    expect(r.data).not.toHaveProperty("amount");
  });

  it("validates pickup preference, condition and notes length", () => {
    expect(createDonationSchema.safeParse({ ...donation, pickupPreference: "dropoff" }).success).toBe(false);
    expect(createDonationSchema.safeParse({ ...donation, condition: "broken" }).success).toBe(false);
    expect(createDonationSchema.safeParse({ ...donation, notes: "x".repeat(501) }).success).toBe(false);
    expect(createDonationSchema.safeParse({ ...donation, notes: undefined }).data?.notes).toBe("");
  });

  it("rejects duplicate photos", () => {
    expect(createDonationSchema.safeParse({ ...donation, imagePaths: [donation.imagePaths[0], donation.imagePaths[0]] }).success).toBe(false);
  });

  it("only allows owner status transitions from the known set", () => {
    expect(setDonationStatusSchema.safeParse({ donationId: "abc", status: "given" }).success).toBe(true);
    expect(setDonationStatusSchema.safeParse({ donationId: "abc", status: "approved" }).success).toBe(false);
  });

  it("rejects path traversal in image paths and more than 5 photos", () => {
    expect(createDonationSchema.safeParse({ ...donation, imagePaths: ["donations/uid1/../uid2/x.jpg"] }).success).toBe(false);
    expect(createDonationSchema.safeParse({ ...donation, imagePaths: Array(6).fill("donations/u/abc123/1.jpg") }).success).toBe(false);
    expect(createDonationSchema.safeParse({ ...donation, imagePaths: [] }).success).toBe(false);
  });

  it("requires a meaningful note when requesting an item", () => {
    expect(applySchema.safeParse({ donationId: "abc", forWhom: "family", message: "pls", phone: "03001234567" }).success).toBe(false);
  });
});
