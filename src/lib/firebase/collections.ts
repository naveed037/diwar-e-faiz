/** Single source of truth for Firestore collection and Storage paths (shared by client, server and scripts). */
export const COLLECTIONS = {
  users: "users",
  userPrivate: "private", // users/{uid}/private/profile
  notifications: "notifications", // users/{uid}/notifications/{id}
  donations: "donations",
  applications: "applications",
  conversations: "conversations",
  messages: "messages", // conversations/{id}/messages/{id}
  categories: "categories",
  reports: "reports",
  successStories: "successStories",
} as const;

export const PRIVATE_PROFILE_DOC = "profile";

export const STORAGE_LIMITS = {
  donationImageBytes: 5 * 1024 * 1024,
  avatarBytes: 2 * 1024 * 1024,
  maxDonationImages: 5,
} as const;

export const storagePaths = {
  donationImage: (uid: string, donationId: string, fileName: string) => `donations/${uid}/${donationId}/${fileName}`,
  donationFolder: (uid: string, donationId: string) => `donations/${uid}/${donationId}/`,
  avatar: (uid: string, fileName: string) => `users/${uid}/avatar/${fileName}`,
} as const;

export const applicationId = (donationId: string, applicantId: string) => `${donationId}_${applicantId}`;
export const reportId = (reporterId: string, targetType: string, targetId: string) => `${reporterId}_${targetType}_${targetId}`;
