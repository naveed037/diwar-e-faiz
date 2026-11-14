export const SITE = {
  name: "Diwar-e-Faiz",
  nameUrdu: "دیوارِ فیض",
  tagline: "Your Extra Can Be Someone's Blessing.",
  taglineUrdu: "آپ کی اضافی چیز، کسی کی ضرورت پوری کر سکتی ہے۔",
  description:
    "Diwar-e-Faiz is a community wall where people give away what they no longer need — clothes, books, furniture, electronics — directly to people who do. Free, local and dignified.",
  url: "https://diwarefaiz.org",
  contact: {
    email: "hello@diwarefaiz.org",
    phone: "+92 42 3578 1100",
    phoneHref: "tel:+924235781100",
    whatsapp: "+92 300 111 3249",
    whatsappHref: "https://wa.me/923001113249",
    address: "2nd Floor, Arfa Software Technology Park, Ferozepur Road, Lahore",
    hours: "Mon – Sat, 10:00 am – 6:00 pm",
  },
  social: {
    facebook: "https://facebook.com/diwarefaiz",
    instagram: "https://instagram.com/diwarefaiz",
    x: "https://x.com/diwarefaiz",
    linkedin: "https://linkedin.com/company/diwarefaiz",
  },
} as const;

export const ROUTES = {
  home: "/",
  donations: "/donations",
  donation: (id: string) => `/donations/${id}`,
  donate: "/donate",
  about: "/about",
  contact: "/contact",
} as const;

export const NAV_LINKS = [
  { label: "Home", href: ROUTES.home },
  { label: "Browse Donations", href: ROUTES.donations },
  { label: "About Us", href: ROUTES.about },
  { label: "Contact", href: ROUTES.contact },
] as const;

export const CITIES = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
] as const;
