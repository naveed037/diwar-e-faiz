import { cn } from "@/lib/utils/cn";
import type { ApplicationStatus } from "@/types/firestore";
import { REQUEST_STATUS } from "../lib/labels";

export function RequestStatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  const meta = REQUEST_STATUS[status];
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold", meta.className, className)}>
      {meta.label}
    </span>
  );
}
