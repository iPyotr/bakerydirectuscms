import "server-only";
import { createDirectus, rest } from "@directus/sdk";

// Internal URL — used by server components / route handlers to talk to Directus
// inside the Docker network (e.g. http://bakery_directus:8055).
export const DIRECTUS_URL =
  process.env.DIRECTUS_URL ?? "https://admin.delovkusa.openlabio.ru";

// Public URL — what browsers see. Used for asset URLs and OAuth redirects.
// Falls back to DIRECTUS_URL when running outside Docker.
export const DIRECTUS_PUBLIC_URL =
  process.env.DIRECTUS_PUBLIC_URL ?? DIRECTUS_URL;

export interface DirectusSchema {
  categories: Array<{
    id: string;
    slug: string;
    title: string;
    subtitle?: string | null;
    image?: string | null;
    slider_image?: string | null;
    sort?: number | null;
    meta_title?: string | null;
    meta_description?: string | null;
    og_image?: string | null;
  }>;
  products: Array<{
    id: string;
    slug: string;
    title: string;
    category?: { slug: string } | null;
    image?: string | null;
    price: number;
    old_price?: number | null;
    weight: string;
    tag?: string | null;
    description?: string | null;
    status?: "published" | "draft" | "archived";
    available?: boolean | null;
    popularity_rank?: number | null;
    meta_title?: string | null;
    meta_description?: string | null;
    og_image?: string | null;
  }>;
  hero_slides: Array<{
    id: string;
    sort?: number | null;
    title: string;
    accent?: string | null;
    description?: string | null;
    image?: string | null;
    cta_label?: string | null;
    cta_href?: string | null;
    active_from?: string | null;
    active_until?: string | null;
  }>;
  promotions: Array<{
    id: string;
    sort?: number | null;
    slug: string;
    title: string;
    tag?: string | null;
    description?: string | null;
    image?: string | null;
    discount_percent?: number | null;
    active_from?: string | null;
    active_until?: string | null;
  }>;
  locations: Array<{
    id: string;
    sort?: number | null;
    title: string;
    address: string;
    phone?: string | null;
    working_hours?: string | null;
    image?: string | null;
    location?: { lat?: number | null; lng?: number | null; zoom?: number | null } | null;
  }>;
  globals: {
    brand_name: string;
    legal_name?: string | null;
    inn?: string | null;
    about_short?: string | null;
    about_long?: string | null;
    production_md?: string | null;
    careers_md?: string | null;
    social?: Record<string, string | undefined> | null;
    app_links?: Record<string, string | undefined> | null;
    email_general?: string | null;
    email_hr?: string | null;
    email_b2b?: string | null;
    tagline_main?: string | null;
    tagline_accent?: string | null;
    meta_title?: string | null;
    meta_description?: string | null;
    seo_keywords?: string[] | null;
    theme_color?: string | null;
    background_color?: string | null;
    payment_methods?: string[] | null;
    opens_at?: string | null;
    closes_at?: string | null;
  };
  nav_menu_items: Array<{
    id: string;
    location: "header" | "footer-customers" | "footer-company" | "mobile-tab";
    label: string;
    href: string;
    icon?: string | null;
    sort?: number | null;
  }>;
  benefits: Array<{
    id: string;
    icon: string;
    title: string;
    description?: string | null;
    sort?: number | null;
  }>;
  legal_pages: Array<{
    id: string;
    slug: string;
    title: string;
    body_md: string;
    show_in_footer?: boolean | null;
    sort?: number | null;
  }>;
}

export const directus = createDirectus<DirectusSchema>(DIRECTUS_URL).with(rest());

export function directusFile(fileId?: string | null, params?: Record<string, string | number>) {
  if (!fileId) return null;
  const query = params
    ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))).toString()}`
    : "";
  return `${DIRECTUS_PUBLIC_URL}/assets/${fileId}${query}`;
}
