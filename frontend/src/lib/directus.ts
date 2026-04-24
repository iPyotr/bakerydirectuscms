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
    products_count?: number | null;
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
  }>;
  globals: {
    brand_name: string;
    legal_name?: string | null;
    inn?: string | null;
    phone: string;
    email?: string | null;
    address: string;
    address_short?: string | null;
    working_hours: string;
    about_short?: string | null;
    about_long?: string | null;
    location?: { lat?: number | null; lng?: number | null; zoom?: number | null } | null;
    social?: Record<string, string | undefined> | null;
    app_links?: Record<string, string | undefined> | null;
  };
}

export const directus = createDirectus<DirectusSchema>(DIRECTUS_URL).with(rest());

export function directusFile(fileId?: string | null, params?: Record<string, string | number>) {
  if (!fileId) return null;
  const query = params
    ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))).toString()}`
    : "";
  return `${DIRECTUS_PUBLIC_URL}/assets/${fileId}${query}`;
}
