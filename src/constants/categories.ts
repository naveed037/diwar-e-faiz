import type { Category, CategorySlug } from "@/types/donation";

/** Fixed category taxonomy. Firestore `categories/{slug}` mirrors these and stores live item counts. */
export const CATEGORIES: Category[] = [
  { slug: "clothing", name: "Clothing", nameUrdu: "کپڑے", description: "Everyday wear, winter coats and formal clothes.", icon: "Shirt" },
  { slug: "books", name: "Books & Study", nameUrdu: "کتابیں", description: "Textbooks, novels, stationery and school bags.", icon: "BookOpen" },
  { slug: "furniture", name: "Furniture", nameUrdu: "فرنیچر", description: "Beds, sofas, chairs, tables and storage.", icon: "Sofa" },
  { slug: "electronics", name: "Electronics", nameUrdu: "الیکٹرانکس", description: "Laptops, phones and working appliances.", icon: "Laptop" },
  { slug: "kids", name: "Kids & Baby", nameUrdu: "بچوں کا سامان", description: "Toys, baby clothes and nursery items.", icon: "Baby" },
  { slug: "kitchen", name: "Kitchen", nameUrdu: "باورچی خانہ", description: "Cookware, crockery and small appliances.", icon: "CookingPot" },
  { slug: "footwear", name: "Footwear", nameUrdu: "جوتے", description: "Shoes, sandals and school shoes for all ages.", icon: "Footprints" },
  { slug: "mobility", name: "Bikes & Mobility", nameUrdu: "سواری", description: "Bicycles, walkers and mobility aids.", icon: "Bike" },
];

const bySlug = new Map(CATEGORIES.map((c) => [c.slug, c]));

export const getCategory = (slug: CategorySlug | string) => bySlug.get(slug as CategorySlug);
