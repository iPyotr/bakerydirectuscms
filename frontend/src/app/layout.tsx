import type { Metadata, Viewport } from "next";
import { Caveat, Inter, Manrope } from "next/font/google";
import "./globals.css";

import { QueryProvider } from "@/components/providers/query-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { fetchCategories, fetchGlobals } from "@/lib/api";
import type { ReactNode } from "react";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-caveat",
  display: "swap",
});

const siteUrl = process.env.SITE_URL ?? "https://delovkusa.openlabio.ru";
const siteName = "Дело вкуса";
const siteDescription =
  "Ремесленная пекарня и собственное производство в Казани: хлеб, сытная и сладкая выпечка, курица гриль, шаурма и полуфабрикаты ручной лепки. Свежая выпечка каждый день, удобный самовывоз.";

// Static metadata (used as defaults). Pages with own metadata via fetchGlobals
// can override these dynamically.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — свежая выпечка каждый день`,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  keywords: [
    "пекарня казань",
    "свежая выпечка",
    "хлеб казань",
    "курица гриль",
    "шаурма казань",
    "пельмени ручной лепки",
    "самовывоз выпечка",
    "дело вкуса",
  ],
  category: "food",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: siteUrl,
    siteName,
    title: `${siteName} — свежая выпечка каждый день`,
    description: siteDescription,
    // Картинка подхватывается из app/opengraph-image.tsx автоматически.
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — свежая выпечка каждый день`,
    description: siteDescription,
    // Картинка — app/twitter-image.tsx.
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Для Telegram и ВК достаточно стандартных OG-тегов — они парсят `og:*`.
  // Yandex тоже уважает OG. Отдельные `yandex-verification` можно добавить
  // в meta.verification если нужно подтверждение в Вебмастере.
  // verification: { yandex: "...", google: "..." },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eae6e1" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1714" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [categories, globals] = await Promise.all([fetchCategories(), fetchGlobals()]);

  // Try to split "г. Корсаков, ул. Гвардейская, 54" into locality + street.
  const parsedAddress = (() => {
    const m = globals.address.match(
      /^(?:г\.?\s*|город\s+)?([^,]+?),\s*(.+)$/i,
    );
    return m
      ? { locality: m[1].trim(), street: m[2].trim() }
      : { locality: undefined, street: globals.address };
  })();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: globals.brandName,
    description: globals.aboutShort ?? siteDescription,
    url: siteUrl,
    telephone: globals.phone,
    ...(globals.email && { email: globals.email }),
    address: {
      "@type": "PostalAddress",
      ...(parsedAddress.locality && { addressLocality: parsedAddress.locality }),
      streetAddress: parsedAddress.street,
      addressCountry: "RU",
    },
    ...(globals.location && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: globals.location.lat,
        longitude: globals.location.lng,
      },
    }),
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "08:00",
      closes: "20:00",
      description: globals.workingHours,
    },
    servesCuisine: ["Bakery", "Russian", "Fast Food"],
    image: `${siteUrl}/opengraph-image`,
    priceRange: "₽₽",
    sameAs: [
      globals.social?.vk,
      globals.social?.telegram,
      globals.social?.instagram,
    ].filter(Boolean),
  };

  return (
    <html
      lang="ru"
      className={`${inter.variable} ${manrope.variable} ${caveat.variable} antialiased`}
    >
      <body className="min-h-dvh flex flex-col bg-stage text-ink">
        <QueryProvider>
          <Header categories={categories} globals={globals} />
          <main className="flex-1 pb-24 md:pb-12">{children}</main>
          <Footer categories={categories} globals={globals} />
          <MobileTabBar />
        </QueryProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
