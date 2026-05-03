import type { MetadataRoute } from "next";
import { fetchGlobals } from "@/lib/api";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const g = await fetchGlobals();
  return {
    name: g.brandName,
    short_name: g.brandName,
    description: g.metaDescription ?? g.aboutShort ?? "",
    start_url: "/",
    display: "standalone",
    background_color: g.backgroundColor ?? "#eae6e1",
    theme_color: g.themeColor ?? "#d62929",
    orientation: "portrait",
    lang: "ru",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "maskable" },
    ],
  };
}
