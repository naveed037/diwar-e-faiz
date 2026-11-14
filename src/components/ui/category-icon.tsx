import { Baby, Bike, BookOpen, CookingPot, Footprints, Laptop, Package, Shirt, Sofa, type LucideProps } from "lucide-react";

const icons = { Baby, Bike, BookOpen, CookingPot, Footprints, Laptop, Shirt, Sofa };

/** Resolves a serialisable icon name (stored with category data) to a Lucide icon. */
export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = icons[name as keyof typeof icons] ?? Package;
  return <Icon aria-hidden {...props} />;
}
