import { MapPin, Quote } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils/cn";
import { Suspense } from "react";
import { getPublishedStories } from "@/server/db/public";

/** Published stories from Firestore. The section is hidden until at least one story is published. */
export function SuccessStories() {
  return (
    <Suspense fallback={null}>
      <StoriesContent />
    </Suspense>
  );
}

async function StoriesContent() {
  const stories = await getPublishedStories(3);
  if (stories.length === 0) return null;

  return (
    <section id="stories" aria-labelledby="stories-heading" className="scroll-mt-20 py-20 sm:py-24">
      <Container>
        <SectionHeading
          align="center"
          eyebrow="Success stories"
          title={<span id="stories-heading">Small things, life-changing moments</span>}
          description="Every item on the wall carries a story. Here are a few from the people who gave and the people who received."
        />

        <ul className="mt-14 grid gap-5 lg:grid-cols-3 lg:gap-6">
          {stories.map((story, i) => {
            const featured = i === 0;
            return (
              <li
                key={story.id}
                className={cn(
                  "relative flex flex-col rounded-4xl p-7 sm:p-8",
                  featured ? "bg-faiz-700 text-cream-50 shadow-lift" : "bg-white ring-1 ring-ink-900/5",
                )}
              >
                <Quote aria-hidden className={cn("size-9", featured ? "text-saffron-400" : "text-faiz-200")} fill="currentColor" strokeWidth={0} />
                <blockquote className={cn("mt-5 flex-1 text-[17px] leading-relaxed", featured ? "text-cream-50" : "text-ink-800")}>
                  “{story.quote}”
                </blockquote>
                <span
                  className={cn(
                    "mt-6 w-fit rounded-full px-3 py-1 text-xs font-semibold",
                    featured ? "bg-white/10 text-cream-50" : "bg-faiz-50 text-faiz-700",
                  )}
                >
                  Received: {story.item}
                </span>
                <div className={cn("mt-6 flex items-center gap-3 border-t pt-6", featured ? "border-white/15" : "border-ink-900/5")}>
                  <Avatar initials={story.initials} className={featured ? "bg-cream-50 text-faiz-800" : undefined} />
                  <div className="min-w-0">
                    <p className="font-semibold">{story.name}</p>
                    <p className={cn("flex items-center gap-1 text-sm", featured ? "text-cream-50/70" : "text-sand-600")}>
                      {story.role} · <MapPin className="size-3" aria-hidden /> {story.city}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
