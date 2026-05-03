import "server-only";
import { aggregate, readItems, readSingleton } from "@directus/sdk";
import type {
  Benefit, Category, Globals, HeroSlide, LegalPage, Location, NavIcon, NavLocation,
  NavMenuItem, Product, Promotion,
} from "@/types";
import { mockCategories, mockGlobals, mockHeroSlides, mockProducts } from "./mocks";
import { directus, directusFile } from "./directus";

const USE_DIRECTUS = process.env.USE_DIRECTUS === "true";
// By default failed Directus requests fall back to mock data so UI never breaks.
// Set DIRECTUS_USE_FALLBACK_MOCKS=false in production to surface API outages
// instead of silently masking them.
const USE_FALLBACK_MOCKS = process.env.DIRECTUS_USE_FALLBACK_MOCKS !== "false";

function handleDirectusError(error: unknown, context: string): never | undefined {
  if (!USE_FALLBACK_MOCKS) {
    throw error instanceof Error
      ? error
      : new Error(`[api.${context}] Directus request failed`);
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[api.${context}] Directus failed, using mocks`, error);
  }
  return undefined;
}

function transformCategory(row: {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  slider_image?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  og_image?: string | null;
}): Category {
  return {
    id: row.id,
    slug: row.slug as Category["slug"],
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    // Raw asset URL — components add their own ?width= via assetUrl().
    image: directusFile(row.image) ?? `/categories/${row.slug}.webp`,
    sliderImage: directusFile(row.slider_image) ?? undefined,
    productsCount: 0, // overwritten in fetchCategories via aggregate
    metaTitle: row.meta_title ?? undefined,
    metaDescription: row.meta_description ?? undefined,
    ogImage: directusFile(row.og_image) ?? undefined,
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
  popularity_rank?: number | null;
  meta_title?: string | null;
  meta_description?: string | null;
  og_image?: string | null;
}): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    categorySlug: (row.category?.slug ?? "bread") as Product["categorySlug"],
    image: directusFile(row.image) ?? `/products/${row.slug}.webp`,
    price: row.price,
    oldPrice: row.old_price ?? undefined,
    weight: row.weight,
    tag: (row.tag as Product["tag"]) ?? undefined,
    description: row.description ?? undefined,
    available: row.available ?? true,
    popularityRank: row.popularity_rank ?? undefined,
    metaTitle: row.meta_title ?? undefined,
    metaDescription: row.meta_description ?? undefined,
    ogImage: directusFile(row.og_image) ?? undefined,
  };
}

export async function fetchCategories(): Promise<Category[]> {
  if (!USE_DIRECTUS) return mockCategories;
  try {
    const rows = await directus.request(
      readItems("categories", { sort: ["sort"], fields: ["*"] }),
    );
    let countByCat = new Map<string, number>();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aggregateAny = aggregate as any;
      const counts = (await directus.request(
        aggregateAny("products", {
          aggregate: { count: "id" },
          groupBy: ["category"],
          query: { filter: { status: { _eq: "published" } } },
        }),
      )) as Array<{ category: string | null; count: { id: string } }>;
      countByCat = new Map(
        counts
          .filter(c => c.category != null)
          .map(c => [c.category as string, Number(c.count.id) || 0]),
      );
    } catch (aggError) {
      // Aggregate may fail under Public role on some Directus versions; degrade gracefully.
      if (process.env.NODE_ENV !== "production") {
        console.warn("[api.fetchCategories] aggregate failed, productsCount=0", aggError);
      }
    }
    return rows.map(r => ({
      ...transformCategory(r),
      productsCount: countByCat.get(r.id) ?? 0,
    }));
  } catch (error) {
    handleDirectusError(error, "fetchCategories");
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
    // No `status: published` filter — Public role permission already restricts
    // it server-side, and the Public role cannot READ the `status` field
    // (intentional — see scoped permissions), so referencing it in filter
    // would 403.
    const rows = (await directus.request(
      readItems("products", {
        fields: ["*", { category: ["slug"] }] as never,
        filter: {
          ...(options?.category ? { category: { slug: { _eq: options.category } } } : {}),
          ...(options?.slugs?.length ? { slug: { _in: options.slugs } } : {}),
        } as never,
        limit: options?.limit ?? 50,
      }),
    )) as Parameters<typeof transformProduct>[0][];
    return rows.map(transformProduct);
  } catch (error) {
    handleDirectusError(error, "fetchProducts");
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
  if (!USE_DIRECTUS) return mockProducts.slice(0, 5);
  try {
    const rows = (await directus.request(
      readItems("products", {
        fields: ["*", { category: ["slug"] }] as never,
        filter: { popularity_rank: { _nnull: true } } as never,
        sort: ["popularity_rank"],
        limit: 10,
      }),
    )) as Parameters<typeof transformProduct>[0][];
    return rows.map(transformProduct);
  } catch (error) {
    handleDirectusError(error, "fetchPopularProducts");
    return mockProducts.slice(0, 5);
  }
}

export async function fetchGlobals(): Promise<Globals> {
  if (!USE_DIRECTUS) return mockGlobals;
  try {
    const row = await directus.request(readSingleton("globals"));
    return {
      brandName: row.brand_name,
      legalName: row.legal_name ?? undefined,
      inn: row.inn ?? undefined,
      // legacy / soon-to-be-removed (Phase 6.1):
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      address: row.address ?? undefined,
      addressShort: row.address_short ?? row.address ?? undefined,
      workingHours: row.working_hours ?? undefined,
      location:
        row.location?.lat != null && row.location?.lng != null
          ? { lat: row.location.lat, lng: row.location.lng, zoom: row.location.zoom ?? 16 }
          : undefined,
      aboutShort: row.about_short ?? undefined,
      aboutLong: row.about_long ?? undefined,
      productionMd: row.production_md ?? undefined,
      careersMd: row.careers_md ?? undefined,
      social: row.social ?? {},
      appLinks: row.app_links ?? {},
      emailGeneral: row.email_general ?? undefined,
      emailHr: row.email_hr ?? undefined,
      emailB2b: row.email_b2b ?? undefined,
      taglineMain: row.tagline_main ?? undefined,
      taglineAccent: row.tagline_accent ?? undefined,
      metaTitle: row.meta_title ?? undefined,
      metaDescription: row.meta_description ?? undefined,
      seoKeywords: row.seo_keywords ?? undefined,
      themeColor: row.theme_color ?? undefined,
      backgroundColor: row.background_color ?? undefined,
      paymentMethods: row.payment_methods ?? undefined,
      opensAt: row.opens_at ?? undefined,
      closesAt: row.closes_at ?? undefined,
    };
  } catch (error) {
    handleDirectusError(error, "fetchGlobals");
    return mockGlobals;
  }
}

export async function fetchLocations(): Promise<Location[]> {
  if (!USE_DIRECTUS) return [];
  try {
    const rows = (await directus.request(
      readItems("locations", {
        sort: ["sort"],
        fields: ["*"] as never,
        limit: 50,
      }),
    )) as Array<{
      id: string;
      title: string;
      address: string;
      phone?: string | null;
      working_hours?: string | null;
      image?: string | null;
      location?: { lat?: number | null; lng?: number | null; zoom?: number | null } | null;
    }>;
    return rows.map((r): Location => ({
      id: r.id,
      title: r.title,
      address: r.address,
      phone: r.phone ?? undefined,
      workingHours: r.working_hours ?? undefined,
      image: directusFile(r.image) ?? undefined,
      location:
        r.location?.lat != null && r.location?.lng != null
          ? { lat: r.location.lat, lng: r.location.lng, zoom: r.location.zoom ?? 16 }
          : undefined,
    }));
  } catch (error) {
    handleDirectusError(error, "fetchLocations");
    return [];
  }
}

export async function fetchHeroSlides(): Promise<HeroSlide[]> {
  if (!USE_DIRECTUS) return mockHeroSlides;
  try {
    const rows = (await directus.request(
      readItems("hero_slides", {
        sort: ["sort"],
        fields: ["*"] as never,
        filter: {
          _and: [
            { _or: [{ active_from: { _null: true } }, { active_from: { _lte: "$NOW" } }] },
            { _or: [{ active_until: { _null: true } }, { active_until: { _gte: "$NOW" } }] },
          ],
        } as never,
        limit: 10,
      }),
    )) as Array<{
      id: string;
      sort?: number | null;
      title: string;
      accent?: string | null;
      description?: string | null;
      image?: string | null;
      cta_label?: string | null;
      cta_href?: string | null;
    }>;

    if (!rows.length) return mockHeroSlides;

    return rows.map((r, idx): HeroSlide => ({
      id: r.id,
      title: r.title,
      accent: r.accent ?? "",
      description: r.description ?? "",
      image:
        directusFile(r.image) ?? mockHeroSlides[idx % mockHeroSlides.length].image,
      cta: {
        label: r.cta_label ?? "В каталог",
        href: r.cta_href ?? "/catalog",
      },
    }));
  } catch (error) {
    handleDirectusError(error, "fetchHeroSlides");
    return mockHeroSlides;
  }
}

export async function fetchPromotions(): Promise<Promotion[]> {
  if (!USE_DIRECTUS) return [];
  try {
    const rows = (await directus.request(
      readItems("promotions", {
        sort: ["sort"] as never,
        fields: ["*"] as never,
        filter: {
          _and: [
            { _or: [{ active_from: { _null: true } }, { active_from: { _lte: "$NOW" } }] },
            { _or: [{ active_until: { _null: true } }, { active_until: { _gte: "$NOW" } }] },
          ],
        } as never,
        limit: 50,
      }),
    )) as Array<{
      id: string; slug: string; title: string; tag?: string | null;
      description?: string | null; image?: string | null;
      discount_percent?: number | null;
    }>;
    return rows.map((r): Promotion => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      tag: (r.tag as Promotion["tag"]) ?? undefined,
      description: r.description ?? undefined,
      image: directusFile(r.image) ?? undefined,
      discountPercent: r.discount_percent ?? undefined,
    }));
  } catch (error) {
    handleDirectusError(error, "fetchPromotions");
    return [];
  }
}

export async function fetchBenefits(): Promise<Benefit[]> {
  if (!USE_DIRECTUS) return [];
  try {
    const rows = (await directus.request(
      readItems("benefits", { sort: ["sort"], fields: ["*"] as never, limit: 20 }),
    )) as Array<{ id: string; icon: string; title: string; description?: string | null }>;
    return rows.map((r): Benefit => ({
      id: r.id,
      icon: r.icon as Benefit["icon"],
      title: r.title,
      description: r.description ?? undefined,
    }));
  } catch (error) {
    handleDirectusError(error, "fetchBenefits");
    return [];
  }
}

export async function fetchNavMenu(location: NavLocation): Promise<NavMenuItem[]> {
  if (!USE_DIRECTUS) return [];
  try {
    const rows = (await directus.request(
      readItems("nav_menu_items", {
        sort: ["sort"],
        fields: ["*"] as never,
        filter: { location: { _eq: location } } as never,
        limit: 20,
      }),
    )) as Array<{
      id: string;
      location: NavLocation;
      label: string;
      href: string;
      icon?: string | null;
      sort?: number | null;
    }>;
    return rows.map((r): NavMenuItem => ({
      id: r.id,
      location: r.location,
      label: r.label,
      href: r.href,
      icon: ((r.icon as NavIcon) ?? "none"),
      sort: r.sort ?? 0,
    }));
  } catch (error) {
    handleDirectusError(error, "fetchNavMenu");
    return [];
  }
}

export async function fetchLegalPage(slug: string): Promise<LegalPage | null> {
  if (!USE_DIRECTUS) return null;
  try {
    const rows = (await directus.request(
      readItems("legal_pages", {
        filter: { slug: { _eq: slug } } as never,
        fields: ["*"] as never,
        limit: 1,
      }),
    )) as Array<{
      id: string; slug: string; title: string; body_md: string;
      show_in_footer?: boolean | null; sort?: number | null;
    }>;
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      bodyMd: r.body_md,
      showInFooter: r.show_in_footer ?? false,
      sort: r.sort ?? 0,
    };
  } catch (error) {
    handleDirectusError(error, "fetchLegalPage");
    return null;
  }
}

export async function fetchFooterLegalLinks(): Promise<LegalPage[]> {
  if (!USE_DIRECTUS) return [];
  try {
    const rows = (await directus.request(
      readItems("legal_pages", {
        filter: { show_in_footer: { _eq: true } } as never,
        sort: ["sort"],
        fields: ["id", "slug", "title", "show_in_footer", "sort"] as never,
        limit: 10,
      }),
    )) as Array<{ id: string; slug: string; title: string; show_in_footer: boolean; sort: number }>;
    return rows.map((r): LegalPage => ({
      id: r.id, slug: r.slug, title: r.title, bodyMd: "",
      showInFooter: r.show_in_footer, sort: r.sort,
    }));
  } catch (error) {
    handleDirectusError(error, "fetchFooterLegalLinks");
    return [];
  }
}

export async function getPrimaryLocation(): Promise<Location | null> {
  const list = await fetchLocations();
  return list[0] ?? null;
}
