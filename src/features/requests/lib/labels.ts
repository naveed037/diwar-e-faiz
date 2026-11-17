import type { ApplicationStatus, RecipientType } from "@/types/firestore";

export const FOR_WHOM_LABEL: Record<RecipientType, string> = {
  myself: "For themselves",
  family: "For their family",
  organisation: "For an organisation",
  someone: "For someone they know",
};

export const MY_FOR_WHOM_LABEL: Record<RecipientType, string> = {
  myself: "For me",
  family: "For my family",
  organisation: "For an organisation",
  someone: "For someone I know",
};

export const REQUEST_STATUS: Record<ApplicationStatus, { label: string; className: string }> = {
  pending: { label: "Waiting for reply", className: "bg-saffron-100 text-saffron-600" },
  accepted: { label: "Accepted", className: "bg-faiz-100 text-faiz-800" },
  completed: { label: "Received", className: "bg-faiz-700 text-cream-50" },
  declined: { label: "Not accepted", className: "bg-cream-300 text-ink-700" },
  withdrawn: { label: "Withdrawn", className: "bg-cream-200 text-sand-600" },
};
