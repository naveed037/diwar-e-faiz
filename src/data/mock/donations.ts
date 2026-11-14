import { photo } from "@/lib/utils/format";
import type { CategorySlug, City, ItemCondition } from "@/types/donation";

/**
 * DEMO DATA ONLY — used by `npm run firebase:seed -- --demo` to populate an empty project.
 * The app itself never renders this file; all pages read Firestore.
 */

type Donor = { name: string; initials: string; memberSince: string; itemsGiven: number; verified: boolean; responseTime: string };

export type SampleDonation = {
  id: string;
  title: string;
  description: string;
  category: CategorySlug;
  condition: ItemCondition;
  status: "available" | "reserved" | "given";
  quantity: number;
  city: City;
  area: string;
  postedAt: string;
  images: string[];
  donor: Donor;
  pickup: string;
  highlights: string[];
};

const donors = {
  ayesha: { name: "Ayesha Malik", initials: "AM", memberSince: "2024", itemsGiven: 23, verified: true, responseTime: "Usually replies within an hour" },
  hamza: { name: "Hamza Qureshi", initials: "HQ", memberSince: "2025", itemsGiven: 7, verified: true, responseTime: "Usually replies within a few hours" },
  sana: { name: "Sana Iqbal", initials: "SI", memberSince: "2023", itemsGiven: 41, verified: true, responseTime: "Usually replies within an hour" },
  bilal: { name: "Bilal Ahmed", initials: "BA", memberSince: "2025", itemsGiven: 4, verified: false, responseTime: "Usually replies within a day" },
  fatima: { name: "Fatima Raza", initials: "FR", memberSince: "2024", itemsGiven: 15, verified: true, responseTime: "Usually replies within a few hours" },
  usman: { name: "Usman Tariq", initials: "UT", memberSince: "2026", itemsGiven: 2, verified: false, responseTime: "Usually replies within a day" },
  zainab: { name: "Zainab Hussain", initials: "ZH", memberSince: "2023", itemsGiven: 32, verified: true, responseTime: "Usually replies within an hour" },
} satisfies Record<string, Donor>;

export const sampleDonations: SampleDonation[] = [
  {
    id: "winter-clothes-bundle",
    title: "Winter clothes bundle — 18 pieces",
    description:
      "Sweaters, shawls, two warm jackets and woollen socks, washed and folded. Mixed adult sizes (M to XL). We moved to Karachi and won't need them anymore — would love for them to reach a family before the cold sets in properly.",
    category: "clothing",
    condition: "good",
    status: "available",
    quantity: 18,
    city: "Lahore",
    area: "Model Town",
    postedAt: "2026-11-13T09:30:00+05:00",
    images: [photo("1489987707025-afc232f7ea0f"), photo("1539533018447-63fcce2678e3"), photo("1556905055-8f358a7a47b2")],
    donor: donors.ayesha,
    pickup: "Pickup from Model Town, Block C. Evenings after 6 pm.",
    highlights: ["Washed and folded", "Sizes M – XL", "Includes 2 jackets"],
  },
  {
    id: "matric-textbooks-set",
    title: "Complete Matric science textbooks (Punjab Board)",
    description:
      "Physics, Chemistry, Biology, Maths and English for 9th and 10th class, plus a few guide books. Some pencil notes in the margins but no torn pages. Perfect for a student starting Matric next session.",
    category: "books",
    condition: "good",
    status: "available",
    quantity: 12,
    city: "Rawalpindi",
    area: "Satellite Town",
    postedAt: "2026-11-12T16:10:00+05:00",
    images: [photo("1512820790803-83ca734da794"), photo("1497633762265-9d179a990aa6")],
    donor: donors.hamza,
    pickup: "Can hand over near Commercial Market, Satellite Town.",
    highlights: ["9th & 10th class", "Punjab Board syllabus", "Includes guide books"],
  },
  {
    id: "dell-laptop-students",
    title: "Dell laptop for a student — Core i5, 8 GB RAM",
    description:
      "Fully working laptop with charger. Battery lasts around 2 hours. Freshly formatted with Windows 11 and LibreOffice. I'd prefer it goes to a university or college student who can't afford one.",
    category: "electronics",
    condition: "good",
    status: "available",
    quantity: 1,
    city: "Islamabad",
    area: "G-11",
    postedAt: "2026-11-12T11:45:00+05:00",
    images: [photo("1496181133206-80ce9b88a853"), photo("1517336714731-489689fd1ca8")],
    donor: donors.sana,
    pickup: "Pickup from G-11/2 or meet at F-10 Markaz.",
    highlights: ["Charger included", "Freshly formatted", "Preferably for a student"],
  },
  {
    id: "three-seater-sofa",
    title: "Three-seater leather sofa",
    description:
      "Tan faux-leather sofa, very comfortable. One small scuff on the left arm, otherwise in great shape. You'll need to arrange a loader pickup — I can help carry it down.",
    category: "furniture",
    condition: "like-new",
    status: "available",
    quantity: 1,
    city: "Karachi",
    area: "Gulshan-e-Iqbal",
    postedAt: "2026-11-11T19:20:00+05:00",
    images: [photo("1540574163026-643ea20ade25"), photo("1555041469-a586c61ea9bc")],
    donor: donors.fatima,
    pickup: "Ground-floor pickup in Block 13-D. Loader required.",
    highlights: ["Seats three", "Minor scuff on arm", "Loader pickup"],
  },
  {
    id: "kids-toys-box",
    title: "Box of toys and soft animals for toddlers",
    description:
      "Stacking toys, a shape sorter, picture books and six soft animals. All cleaned. My son has outgrown them — suitable for ages 1 to 4. Happy for a daycare or orphanage to take them too.",
    category: "kids",
    condition: "good",
    status: "available",
    quantity: 1,
    city: "Lahore",
    area: "DHA Phase 5",
    postedAt: "2026-11-11T10:05:00+05:00",
    images: [photo("1515488042361-ee00e0ddd4e4"), photo("1525507119028-ed4c629a60a3")],
    donor: donors.zainab,
    pickup: "Can drop off within DHA and Cantt.",
    highlights: ["Ages 1 – 4", "Cleaned", "Drop-off available"],
  },
  {
    id: "school-backpacks",
    title: "Four new school backpacks",
    description:
      "Unused navy backpacks left over from our office's back-to-school drive. Padded straps and a laptop sleeve. Ideal for middle or high school students.",
    category: "books",
    condition: "new",
    status: "available",
    quantity: 4,
    city: "Faisalabad",
    area: "Peoples Colony",
    postedAt: "2026-11-10T13:00:00+05:00",
    images: [photo("1553062407-98eeb64c6a62")],
    donor: donors.sana,
    pickup: "Collect from our office on Jail Road, 10 am – 5 pm.",
    highlights: ["Brand new", "Padded straps", "4 available"],
  },
  {
    id: "cookware-set",
    title: "Cast-iron pot and cookware set",
    description:
      "A heavy enamel cooking pot, two frying pans, a pressure cooker and serving spoons. Everything works perfectly; we received duplicates after our wedding.",
    category: "kitchen",
    condition: "like-new",
    status: "reserved",
    quantity: 5,
    city: "Multan",
    area: "Gulgasht Colony",
    postedAt: "2026-11-09T17:40:00+05:00",
    images: [photo("1590794056226-79ef3a8147e1"), photo("1556909114-f6e7ad7d3136")],
    donor: donors.fatima,
    pickup: "Pickup near Gulgasht main boulevard.",
    highlights: ["5 pieces", "Barely used", "Includes pressure cooker"],
  },
  {
    id: "mens-bicycle",
    title: "Road bicycle — great for a daily commute",
    description:
      "Lightweight bicycle with new tyres and a serviced chain. I used it to commute to university. Would be a big help for someone who walks long distances to work or school.",
    category: "mobility",
    condition: "good",
    status: "available",
    quantity: 1,
    city: "Peshawar",
    area: "University Town",
    postedAt: "2026-11-09T08:15:00+05:00",
    images: [photo("1485965120184-e220f721d03e")],
    donor: donors.bilal,
    pickup: "Pickup from University Town, near Arbab Road.",
    highlights: ["New tyres", "Recently serviced", "Lightweight frame"],
  },
  {
    id: "sneakers-size-42",
    title: "Two pairs of sneakers, size 42",
    description:
      "One red running shoe pair and one white casual pair. Worn a handful of times — they just didn't fit right. Clean and odour-free.",
    category: "footwear",
    condition: "like-new",
    status: "available",
    quantity: 2,
    city: "Karachi",
    area: "PECHS",
    postedAt: "2026-11-08T15:30:00+05:00",
    images: [photo("1542291026-7eec264c27ff"), photo("1608231387042-66d1773070a5")],
    donor: donors.usman,
    pickup: "Meet at Tariq Road or courier at your cost.",
    highlights: ["Size 42 (EU)", "Worn a few times", "2 pairs"],
  },
  {
    id: "dining-table-six",
    title: "Dining table with six chairs",
    description:
      "Solid wooden dining table with six green upholstered chairs. Table top has light marks from use. Ideal for a family that's just moved into a new home.",
    category: "furniture",
    condition: "good",
    status: "available",
    quantity: 1,
    city: "Islamabad",
    area: "Bahria Town Phase 4",
    postedAt: "2026-11-07T12:00:00+05:00",
    images: [photo("1617806118233-18e1de247200"), photo("1586023492125-27b2c045efd7")],
    donor: donors.ayesha,
    pickup: "Loader pickup from Bahria Town Phase 4.",
    highlights: ["Seats six", "Solid wood", "Loader pickup"],
  },
  {
    id: "smartphone-unlocked",
    title: "Smartphone with charger — PTA approved",
    description:
      "Two-year-old phone, PTA approved, 128 GB. Screen protector applied, no cracks. Reset to factory settings. Hoping it helps someone stay connected for work or online classes.",
    category: "electronics",
    condition: "good",
    status: "available",
    quantity: 1,
    city: "Lahore",
    area: "Johar Town",
    postedAt: "2026-11-06T18:50:00+05:00",
    images: [photo("1592899677977-9c10ca588bbd")],
    donor: donors.hamza,
    pickup: "Meet at Emporium Mall, Johar Town.",
    highlights: ["PTA approved", "128 GB", "Factory reset"],
  },
  {
    id: "denim-jeans-bundle",
    title: "Bundle of denim jeans (men's & women's)",
    description:
      "Seven pairs of jeans in different sizes, waist 28 to 34. Washed and in wearable condition. Good for a family or a community clothing bank.",
    category: "clothing",
    condition: "good",
    status: "given",
    quantity: 7,
    city: "Rawalpindi",
    area: "Bahria Town Phase 7",
    postedAt: "2026-11-05T10:30:00+05:00",
    images: [photo("1605518216938-7c31b7b14ad0"), photo("1576566588028-4147f3842f27")],
    donor: donors.zainab,
    pickup: "Pickup from Phase 7, near Spring North.",
    highlights: ["Waist 28 – 34", "7 pairs", "Washed"],
  },
  {
    id: "double-bed-frame",
    title: "Double bed frame with headboard",
    description:
      "Upholstered double bed frame with a cushioned headboard. Mattress not included. Can be dismantled for transport — all screws kept in a labelled bag.",
    category: "furniture",
    condition: "like-new",
    status: "available",
    quantity: 1,
    city: "Lahore",
    area: "Bahria Town",
    postedAt: "2026-11-04T14:20:00+05:00",
    images: [photo("1559599238-308793637427")],
    donor: donors.fatima,
    pickup: "Dismantled and ready for pickup in Bahria Town, Sector C.",
    highlights: ["Double size", "Comes dismantled", "Mattress not included"],
  },
  {
    id: "toaster-oven",
    title: "Toaster oven, 25 litres",
    description:
      "Works perfectly — bakes, grills and toasts. Upgraded to a larger oven so this one needs a new home. Includes the baking tray and rack.",
    category: "kitchen",
    condition: "good",
    status: "available",
    quantity: 1,
    city: "Faisalabad",
    area: "Madina Town",
    postedAt: "2026-11-03T09:10:00+05:00",
    images: [photo("1574269909862-7e1d70bb8078"), photo("1570222094114-d054a817e56b")],
    donor: donors.bilal,
    pickup: "Pickup from Madina Town, near Susan Road.",
    highlights: ["25 L capacity", "Tray included", "Fully working"],
  },
];
