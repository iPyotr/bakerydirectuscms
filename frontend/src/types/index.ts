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
  productsCount: number;
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
  phone: string;
  email?: string;
  address: string;
  addressShort: string;
  workingHours: string;
  aboutShort?: string;
  aboutLong?: string;
  location?: GeoLocation;
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
