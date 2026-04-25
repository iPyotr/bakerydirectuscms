const priceFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

export function formatPrice(value: number): string {
  return `${priceFormatter.format(value)} ₽`;
}

export function formatCount(value: number, forms: [string, string, string]): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${value} ${forms[2]}`;
  if (mod10 === 1) return `${value} ${forms[0]}`;
  if (mod10 >= 2 && mod10 <= 4) return `${value} ${forms[1]}`;
  return `${value} ${forms[2]}`;
}

export const productsCount = (n: number) => formatCount(n, ["товар", "товара", "товаров"]);

/**
 * Append Directus on-the-fly transformation params to an asset URL.
 * Local files (/products/foo.webp) are returned untouched so Next.js can
 * serve them as static assets.
 */
export function assetUrl(
  src: string | null | undefined,
  opts: {
    width?: number;
    height?: number;
    quality?: number;
    format?: "webp" | "avif" | "jpg";
    fit?: "cover" | "contain" | "inside" | "outside";
  } = {},
): string {
  if (!src) return "";
  // Only Directus /assets/ URLs accept transformation params.
  if (!src.includes("/assets/")) return src;
  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(opts.width));
  if (opts.height) params.set("height", String(opts.height));
  if (opts.quality) params.set("quality", String(opts.quality));
  if (opts.format) params.set("format", opts.format);
  if (opts.fit) params.set("fit", opts.fit);
  if (params.toString().length === 0) return src;
  const sep = src.includes("?") ? "&" : "?";
  return src + sep + params.toString();
}
