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

export const metadata: Metadata = {
  title: {
    default: "Дело вкуса — пекарня, кулинария и полуфабрикаты в Казани",
    template: "%s · Дело вкуса",
  },
  description:
    "Ремесленная пекарня и собственное производство: хлеб, сытная и сладкая выпечка, курица гриль, шаурма, пельмени ручной лепки.",
  metadataBase: new URL("https://delovkusa.openlabio.ru"),
  applicationName: "Дело вкуса",
  authors: [{ name: "Дело вкуса" }],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Дело вкуса",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#efebe6",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [categories, globals] = await Promise.all([fetchCategories(), fetchGlobals()]);

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
      </body>
    </html>
  );
}
