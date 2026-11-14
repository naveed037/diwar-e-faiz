import type { SuccessStory } from "@/types/donation";

/** Sample data — will be replaced by a Firestore `stories` collection. */
export const stories: SuccessStory[] = [
  {
    id: "rukhsana",
    quote:
      "My daughter got a laptop through Diwar-e-Faiz in her second year of BS. She hasn't missed a single online assignment since. The donor even sent her a message wishing her luck.",
    name: "Rukhsana Bibi",
    initials: "RB",
    role: "Mother of a university student",
    city: "Islamabad",
    item: "Laptop",
  },
  {
    id: "imran",
    quote:
      "We furnished an entire classroom for our community school — twenty chairs and two tables — all from people in our own city. It took less than a week.",
    name: "Imran Siddiqui",
    initials: "IS",
    role: "Principal, Roshni Community School",
    city: "Karachi",
    item: "Classroom furniture",
  },
  {
    id: "mehwish",
    quote:
      "I used to feel guilty throwing things away. Now I post them, and within a day someone who actually needs them picks them up. It's the easiest good deed I do every month.",
    name: "Mehwish Khan",
    initials: "MK",
    role: "Donor since 2024",
    city: "Lahore",
    item: "Clothes & kitchenware",
  },
];
