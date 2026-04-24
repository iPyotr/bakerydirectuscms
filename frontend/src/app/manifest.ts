import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Дело вкуса",
    short_name: "Дело вкуса",
    description:
      "Пекарня, кулинария и полуфабрикаты ручной лепки в Казани. Свежая выпечка каждый день.",
    start_url: "/",
    display: "standalone",
    background_color: "#eae6e1",
    theme_color: "#d62929",
    orientation: "portrait",
    lang: "ru",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      {
        src: "/icon",
        sizes: "64x64",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
