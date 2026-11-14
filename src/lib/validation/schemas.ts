import { z } from "zod";
import { CITIES } from "@/constants/site";
import { STORAGE_LIMITS } from "@/lib/firebase/collections";

/**
 * Input schemas. Client forms may use them for instant feedback, but the server ALWAYS
 * re-parses every input with these schemas before touching Firestore — client checks are a convenience only.
 */

export const CATEGORY_SLUGS = ["clothing", "books", "furniture", "electronics", "kids", "kitchen", "footwear", "mobility"] as const;
export const CONDITIONS = ["new", "like-new", "good", "fair"] as const;

const id = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/, "Invalid identifier.");
const city = z.enum(CITIES, { error: "Select your city." });
const text = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be at most ${max} characters.`);

/** Pakistani mobile numbers: 03xx xxxxxxx or +92 3xx xxxxxxx. Normalised to +923xxxxxxxxx. */
export const pkMobile = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(\+92|0)3\d{9}$/, "Enter a Pakistani mobile number, e.g. 0300 1234567."))
  .transform((v) => (v.startsWith("0") ? `+92${v.slice(1)}` : v));

// ---------- Auth / profile ----------

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Password is too long.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.");

/** Optional phone: empty input means "no phone" (null). */
export const optionalPkMobile = z
  .union([z.literal(""), pkMobile])
  .optional()
  .transform((v) => (v ? v : null));

export const avatarPath = z.string().regex(/^users\/[A-Za-z0-9]+\/avatar\/[A-Za-z0-9][A-Za-z0-9._-]*$/, "Invalid photo path.");

/** Profile fields shared by first-time setup and later edits. Roles don't exist: everyone can donate and request. */
export const profileSchema = z.object({
  displayName: text(2, 60, "Full name"),
  city,
  area: text(2, 60, "Area"),
  phone: optionalPkMobile,
  bio: z.string().trim().max(300, "Introduction must be at most 300 characters.").default(""),
  /** New uploaded avatar, verified server-side; `null` removes the current photo; omitted keeps it. */
  photoPath: avatarPath.nullable().optional(),
});

export const completeRegistrationSchema = profileSchema.omit({ photoPath: true });

/** Client-only (Firebase Auth handles credentials); the profile part is re-validated on the server. */
export const registerSchema = completeRegistrationSchema.extend({
  email: z.email("Please enter a valid email address."),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password."),
});

// ---------- Donations ----------

/** Uploaded image paths must live in the caller's own folder; the server re-checks the owner and file metadata. */
export const donationImagePath = z
  .string()
  .regex(/^donations\/[A-Za-z0-9]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9][A-Za-z0-9._-]*$/, "Invalid image path.");

export const PICKUP_PREFERENCES = ["pickup", "delivery", "either"] as const;

/**
 * Listing fields. Deliberately has NO price/amount field: every donation is free.
 * zod strips unknown keys, so a "price" sent by a modified client is silently dropped.
 */
export const donationFieldsSchema = z.object({
  title: text(5, 80, "Title"),
  categoryId: z.enum(CATEGORY_SLUGS, { error: "Choose a category." }),
  description: text(20, 2000, "Description"),
  condition: z.enum(CONDITIONS, { error: "Choose the item's condition." }),
  city,
  area: text(2, 60, "Area"),
  pickupPreference: z.enum(PICKUP_PREFERENCES, { error: "Choose pickup or delivery." }),
  notes: z.string().trim().max(500, "Notes must be at most 500 characters.").default(""),
  imagePaths: z
    .array(donationImagePath)
    .min(1, "Add at least one photo.")
    .max(STORAGE_LIMITS.maxDonationImages, `Add at most ${STORAGE_LIMITS.maxDonationImages} photos.`)
    .refine((paths) => new Set(paths).size === paths.length, "Each photo can only be added once."),
});

export const createDonationSchema = donationFieldsSchema.extend({ donationId: id });
export const updateDonationSchema = donationFieldsSchema.extend({ donationId: id });

export const donationIdSchema = z.object({ donationId: id });

/** Owner-driven status changes. "relist" brings a removed listing back (it is re-reviewed first). */
export const setDonationStatusSchema = z.object({
  donationId: id,
  status: z.enum(["available", "reserved", "given", "relist"]),
});

// ---------- Applications ----------

export const applySchema = z.object({
  donationId: id,
  forWhom: z.enum(["myself", "family", "organisation", "someone"]),
  message: text(20, 1000, "Your note"),
  phone: pkMobile,
});

export const decideApplicationSchema = z.object({
  applicationId: id,
  decision: z.enum(["accept", "decline"]),
});

export const applicationIdSchema = z.object({ applicationId: id });

// ---------- Messaging ----------

export const sendMessageSchema = z.object({
  conversationId: id,
  text: text(1, 2000, "Message"),
});

export const conversationIdSchema = z.object({ conversationId: id });

// ---------- Notifications ----------

export const markNotificationsReadSchema = z.object({ notificationIds: z.array(id).min(1).max(100) });

// ---------- Reports ----------

export const createReportSchema = z.object({
  targetType: z.enum(["donation", "user", "message"]),
  targetId: z.string().trim().min(1).max(300),
  reason: z.enum(["spam", "scam", "prohibited", "inappropriate", "harassment", "other"]),
  details: z.string().trim().max(1000, "Details must be at most 1000 characters.").default(""),
});

// ---------- Success stories ----------

export const submitStorySchema = z.object({
  donationId: id.optional(),
  quote: text(40, 600, "Your story"),
  role: text(2, 60, "Role"),
  city,
  itemLabel: text(2, 60, "Item"),
});

// ---------- Admin ----------

export const moderateDonationSchema = z.object({
  donationId: id,
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(300).optional(),
});

export const resolveReportSchema = z.object({
  reportId: z.string().trim().min(1).max(500),
  status: z.enum(["reviewing", "resolved", "dismissed"]),
  resolution: z.string().trim().max(500).optional(),
});

export const publishStorySchema = z.object({ storyId: id, featured: z.boolean().default(false) });

export type CreateDonationInput = z.input<typeof createDonationSchema>;
export type ApplyInput = z.input<typeof applySchema>;
