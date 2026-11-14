import { ImageOff, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/ui/category-icon";
import { getCategory } from "@/constants/categories";
import { ROUTES } from "@/constants/site";
import { cn } from "@/lib/utils/cn";
import { CONDITION_LABEL, formatDate } from "@/lib/utils/format";
import type { PublicDonation } from "@/types/donation";
import { DonorAvatar } from "./donor-avatar";
import { SaveButton } from "./save-button";
import { StatusBadge } from "./status-badge";

/**
 * Donation card. Uses the "stretched link" pattern: the title link covers the whole card,
 * while the save button sits above it so the two controls never nest.
 */
export function DonationCard({ donation, priority = false }: { donation: PublicDonation; priority?: boolean }) {
  const category = getCategory(donation.categoryId);
  const cover = donation.images[0];

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-ink-900/5 transition duration-300",
        "hover:-translate-y-1 hover:shadow-lift focus-within:ring-2 focus-within:ring-faiz-500",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-cream-200">
        {cover ? (
          <Image
            src={cover}
            alt={donation.title}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
            className={cn("object-cover transition duration-500 group-hover:scale-[1.04]", donation.status === "given" && "grayscale-[60%]")}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sand-400">
            <ImageOff className="size-8" aria-hidden />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <StatusBadge status={donation.status} />
        </div>
        <SaveButton title={donation.title} className="absolute top-3 right-3 z-10" />
        {donation.images.length > 1 && (
          <Badge tone="muted" className="absolute bottom-3 left-3">
            {donation.images.length} photos
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {category && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-faiz-600">
            <CategoryIcon name={category.icon} className="size-3.5" />
            {category.name}
          </p>
        )}
        <h3 className="mt-2 line-clamp-2 text-[17px] leading-snug font-semibold text-ink-900">
          <Link href={ROUTES.donation(donation.id)} className="after:absolute after:inset-0 focus:outline-none">
            {donation.title}
          </Link>
        </h3>
        <p className="mt-2 mb-5 flex items-center gap-1.5 text-sm text-sand-600">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {donation.area}, {donation.city}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink-900/5 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <DonorAvatar name={donation.donor.displayName} photoURL={donation.donor.photoURL} size={28} />
            <span className="truncate text-xs text-sand-600">{donation.donor.displayName}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs text-sand-500">
            <span className="rounded-full bg-cream-200 px-2 py-0.5 font-medium text-ink-700">{CONDITION_LABEL[donation.condition]}</span>
            {donation.createdAt && <time dateTime={donation.createdAt}>{formatDate(donation.createdAt)}</time>}
          </div>
        </div>
      </div>
    </article>
  );
}
