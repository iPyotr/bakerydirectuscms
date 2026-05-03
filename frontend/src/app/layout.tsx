import type { Metadata, Viewport } from "next";
import { Caveat, Inter, Manrope } from "next/font/google";
import "./globals.css";

import { QueryProvider } from "@/components/providers/query-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { fetchCategories, fetchGlobals, fetchNavMenu, getPrimaryLocation } from "@/lib/api";
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

export async function generateMetadata(): Promise<Metadata> {
  const g = await fetchGlobals();
  const taglineSuffix = [g.taglineMain, g.taglineAccent].filter(Boolean).join(" ").trim();
  const fallbackTitle = `${g.brandName}${taglineSuffix ? " — " + taglineSuffix : ""}`;
  const title = g.metaTitle ?? fallbackTitle;
  const description = g.metaDescription ?? g.aboutShort ?? "";
  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s · ${g.brandName}` },
    description,
    applicationName: g.brandName,
    authors: [{ name: g.brandName }],
    creator: g.brandName,
    publisher: g.brandName,
    keywords: g.seoKeywords ?? [],
    category: "food",
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      url: siteUrl,
      siteName: g.brandName,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
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
  };
}

export async function generateViewport(): Promise<Viewport> {
  const g = await fetchGlobals();
  return {
    width: "device-width",
    initialScale: 1,
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: g.backgroundColor ?? "#eae6e1" },
      { media: "(prefers-color-scheme: dark)", color: "#1b1714" },
    ],
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [categories, globals, primary, headerNav] = await Promise.all([
    fetchCategories(),
    fetchGlobals(),
    getPrimaryLocation(),
    fetchNavMenu("header"),
  ]);

  const addr = primary?.address ?? globals.address ?? "";
  const phone = primary?.phone ?? globals.phone ?? "";
  const geo = primary?.location ?? globals.location;
  const opens = globals.opensAt ?? "08:00";
  const closes = globals.closesAt ?? "20:00";

  const parsedAddress = (() => {
    if (!addr) return { locality: undefined, street: "" };
    const m = addr.match(/^(?:г\.?\s*|город\s+)?([^,]+?),\s*(.+)$/i);
    return m
      ? { locality: m[1].trim(), street: m[2].trim() }
      : { locality: undefined, street: addr };
  })();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: globals.brandName,
    description: globals.aboutShort ?? globals.metaDescription ?? "",
    url: siteUrl,
    ...(phone && { telephone: phone }),
    ...(globals.emailGeneral && { email: globals.emailGeneral }),
    ...(addr && {
      address: {
        "@type": "PostalAddress",
        ...(parsedAddress.locality && { addressLocality: parsedAddress.locality }),
        streetAddress: parsedAddress.street,
        addressCountry: "RU",
      },
    }),
    ...(geo && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: geo.lat,
        longitude: geo.lng,
      },
    }),
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens,
      closes,
      ...(primary?.workingHours && { description: primary.workingHours }),
      ...(!primary && globals.workingHours && { description: globals.workingHours }),
    },
    image: `${siteUrl}/opengraph-image`,
    sameAs: [globals.social?.vk, globals.social?.telegram, globals.social?.instagram].filter(
      Boolean,
    ),
  };

  return (
    <html
      lang="ru"
      className={`${inter.variable} ${manrope.variable} ${caveat.variable} antialiased`}
    >
      <body className="min-h-dvh flex flex-col bg-stage text-ink">
        <QueryProvider>
          <Header
            categories={categories}
            globals={globals}
            primaryLocation={primary}
            headerNav={headerNav}
          />
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
