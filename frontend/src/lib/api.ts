import "server-only";
import { readItems, readSingleton } from "@directus/sdk";
import type { Category, Globals, HeroSlide, Product } from "@/types";
import { mockCategories, mockGlobals, mockHeroSlides, mockPopularSlugs, mockProducts } from "./mocks";
import { directus, directusFile } from "./directus";

const USE_DIRECTUS = process.env.USE_DIRECTUS === "true";

function transformCategory(row: {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  slider_image?: string | null;
  products_count?: number | null;
}): Category {
  return {
    id: row.id,
    slug: row.slug as Category["slug"],
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    image: directusFile(row.image, { width: 512 }) ?? `/categories/${row.slug}.png`,
    sliderImage: directusFile(row.slider_image, { width: 960 }) ?? undefined,
    productsCount: row.products_count ?? 0,
  };
}

function transformProduct(row: {
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
  available?: boolean | null;
}): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    categorySlug: (row.category?.slug ?? "bread") as Product["categorySlug"],
    image: directusFile(row.image, { width: 640 }) ?? `/products/${row.slug}.png`,
    price: row.price,
    oldPrice: row.old_price ?? undefined,
    weight: row.weight,
    tag: (row.tag as Product["tag"]) ?? undefined,
    description: row.description ?? undefined,
    available: row.available ?? true,
  };
}

export async function fetchCategories(): Promise<Category[]> {
  if (!USE_DIRECTUS) return mockCategories;
  try {
    const rows = await directus.request(
      readItems("categories", { sort: ["sort"], fields: ["*"] }),
    );
    return rows.map(transformCategory);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[api.fetchCategories] Directus failed, using mocks", error);
    }
    return mockCategories;
  }
}

function filterMockProducts(options?: {
  category?: string;
  limit?: number;
  slugs?: string[];
}): Product[] {
  let list = mockProducts;
  if (options?.category) list = list.filter((p) => p.categorySlug === options.category);
  if (options?.slugs?.length) {
    list = options.slugs
      .map((s) => list.find((p) => p.slug === s))
      .filter((p): p is Product => Boolean(p));
  }
  if (options?.limit) list = list.slice(0, options.limit);
  return list;
}

export async function fetchProducts(options?: {
  category?: string;
  limit?: number;
  slugs?: string[];
}): Promise<Product[]> {
  if (!USE_DIRECTUS) return filterMockProducts(options);
  try {
    const rows = (await directus.request(
      readItems("products", {
        fields: ["*", { category: ["slug"] }] as never,
        filter: {
          status: { _eq: "published" },
          ...(options?.category ? { category: { slug: { _eq: options.category } } } : {}),
          ...(options?.slugs?.length ? { slug: { _in: options.slugs } } : {}),
        } as never,
        limit: options?.limit ?? 50,
      }),
    )) as Parameters<typeof transformProduct>[0][];
    return rows.map(transformProduct);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[api.fetchProducts] Directus failed, using mocks", error);
    }
    // Bugfix: fallback must honour the same filters so /product/[slug] doesn't
    // always resolve to mockProducts[0].
    return filterMockProducts(options);
  }
}

export async function fetchProduct(slug: string): Promise<Product | null> {
  const list = await fetchProducts({ slugs: [slug] });
  return list[0] ?? null;
}

export async function fetchPopularProducts(): Promise<Product[]> {
  return fetchProducts({ slugs: mockPopularSlugs });
}

export async function fetchGlobals(): Promise<Globals> {
  if (!USE_DIRECTUS) return mockGlobals;
  try {
    const row = await directus.request(readSingleton("globals"));
    return {
      brandName: row.brand_name,
      legalName: row.legal_name ?? undefined,
      inn: row.inn ?? undefined,
      phone: row.phone,
      email: row.email ?? undefined,
      address: row.address,
      addressShort: row.address_short ?? row.address,
      workingHours: row.working_hours,
      aboutShort: row.about_short ?? undefined,
      aboutLong: row.about_long ?? undefined,
      location:
        row.location?.lat != null && row.location?.lng != null
          ? { lat: row.location.lat, lng: row.location.lng, zoom: row.location.zoom ?? 16 }
          : undefined,
      social: row.social ?? {},
      appLinks: row.app_links ?? {},
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[api.fetchGlobals] Directus failed, using mocks", error);
    }
    return mockGlobals;
  }
}

export async function fetchHeroSlides(): Promise<HeroSlide[]> {
  return mockHeroSlides;
}
