export type CategorySlug =
  | "bread"
  | "savory-pastry"
  | "sweet-pastry"
  | "ready-meals"
  | "frozen"
  | "drinks";

export interface Category {
  id: string;
  slug: CategorySlug;
  title: string;
  subtitle?: string;
  image: string;
  sliderImage?: string;
  productsCount: number; // computed at fetch time via aggregate
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
}

export type ProductTag = "hit" | "new" | "sale" | "veg";

export interface Product {
  id: string;
  slug: string;
  title: string;
  categorySlug: CategorySlug;
  image: string;
  price: number;
  oldPrice?: number;
  weight: string;
  tag?: ProductTag;
  description?: string;
  available: boolean;
  popularityRank?: number;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  zoom?: number;
}

export interface Globals {
  brandName: string;
  legalName?: string;
  inn?: string;

  aboutShort?: string;
  aboutLong?: string;
  productionMd?: string;
  careersMd?: string;

  social: {
    vk?: string;
    telegram?: string;
    instagram?: string;
    youtube?: string;
  };
  appLinks?: {
    appStore?: string;
    googlePlay?: string;
    ruStore?: string;
  };

  emailGeneral?: string;
  emailHr?: string;
  emailB2b?: string;

  taglineMain?: string;
  taglineAccent?: string;

  metaTitle?: string;
  metaDescription?: string;
  seoKeywords?: string[];

  themeColor?: string;
  backgroundColor?: string;
  paymentMethods?: string[];

  opensAt?: string;
  closesAt?: string;
}

export interface Location {
  id: string;
  title: string;
  address: string;
  phone?: string;
  workingHours?: string;
  image?: string;
  location?: GeoLocation;
}

export interface HeroSlide {
  id: string;
  title: string;
  accent: string;
  description: string;
  image: string;
  cta: { label: string; href: string };
}

export interface Promotion {
  id: string;
  slug: string;
  title: string;
  tag?: ProductTag;
  description?: string;
  image?: string;
  discountPercent?: number;
}

export type BenefitIcon = "sparkle" | "chef" | "heart" | "pickup";

export interface Benefit {
  id: string;
  icon: BenefitIcon;
  title: string;
  description?: string;
}

export type NavLocation = "header" | "footer-customers" | "footer-company" | "mobile-tab";
export type NavIcon = "home" | "catalog" | "cart" | "promo" | "profile" | "none";

export interface NavMenuItem {
  id: string;
  location: NavLocation;
  label: string;
  href: string;
  icon: NavIcon;
  sort: number;
}

export interface LegalPage {
  id: string;
  slug: string;
  title: string;
  bodyMd: string;
  showInFooter: boolean;
  sort: number;
}
