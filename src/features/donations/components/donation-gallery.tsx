"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export function DonationGallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const multiple = images.length > 1;
  const go = (delta: number) => setIndex((i) => (i + delta + images.length) % images.length);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="group relative aspect-[4/3] overflow-hidden rounded-4xl bg-cream-200 ring-1 ring-ink-900/5"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
      >
        {images.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={`${title} — photo ${i + 1} of ${images.length}`}
            fill
            priority={i === 0}
            sizes="(min-width: 1024px) 60vw, 100vw"
            className={cn("object-cover transition-opacity duration-500", i === index ? "opacity-100" : "opacity-0")}
            aria-hidden={i !== index}
          />
        ))}
        {multiple && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute top-1/2 left-4 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-soft backdrop-blur transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute top-1/2 right-4 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-soft backdrop-blur transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <ChevronRight className="size-5" />
            </button>
            <p className="absolute right-4 bottom-4 rounded-full bg-ink-900/70 px-3 py-1 text-xs font-semibold text-cream-50 backdrop-blur">
              {index + 1} / {images.length}
            </p>
          </>
        )}
      </div>

      {multiple && (
        <div className="flex gap-3">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "relative aspect-[4/3] w-24 cursor-pointer overflow-hidden rounded-2xl ring-2 transition sm:w-28",
                i === index ? "ring-faiz-600" : "opacity-70 ring-transparent hover:opacity-100",
              )}
            >
              <Image src={src} alt="" fill sizes="112px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
