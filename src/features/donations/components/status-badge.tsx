import { Badge } from "@/components/ui/badge";
import type { PublicStatus } from "@/types/donation";

const config: Record<PublicStatus, { label: string; dot: string }> = {
  available: { label: "Available", dot: "bg-faiz-500" },
  reserved: { label: "Reserved", dot: "bg-saffron-400" },
  given: { label: "Given away", dot: "bg-sand-400" },
};

export function StatusBadge({ status, className }: { status: PublicStatus; className?: string }) {
  const { label, dot } = config[status];
  return (
    <Badge tone="white" className={className}>
      <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </Badge>
  );
}
