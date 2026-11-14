import { CategoriesSection } from "@/features/home/components/categories-section";
import { CtaBanner } from "@/features/home/components/cta-banner";
import { Hero } from "@/features/home/components/hero";
import { HowItWorks } from "@/features/home/components/how-it-works";
import { ImpactStats } from "@/features/home/components/impact-stats";
import { RecentDonations } from "@/features/home/components/recent-donations";
import { SuccessStories } from "@/features/home/components/success-stories";

export default function HomePage() {
  return (
    <>
      <Hero />
      <RecentDonations />
      <CategoriesSection />
      <ImpactStats />
      <HowItWorks />
      <SuccessStories />
      <CtaBanner />
    </>
  );
}
