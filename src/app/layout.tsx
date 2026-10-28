import type { Metadata } from "next";
import { Noto_Naskh_Arabic, Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { cookies } from "next/headers";
import { directionFor } from "@/lib/utils";
import "./globals.css";

const sans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif" });
const arabic = Noto_Naskh_Arabic({ subsets: ["arabic"], weight: ["500", "600", "700"], variable: "--font-arabic" });

export const metadata: Metadata = {
  title: { default: "Governance Innovation Community", template: "%s · GIC" },
  description: "A six-month collaboration for public officials, institutions, and governance experts.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const locale = jar.get("gic-locale")?.value ?? "en";
  const safeLocale = locale === "fr" || locale === "ar" ? locale : "en";
  return (
    <html lang={safeLocale} dir={directionFor(safeLocale)} data-scroll-behavior="smooth" className={`${sans.variable} ${serif.variable} ${arabic.variable} h-full`}>
      <body className="min-h-full antialiased">
        <a className="skip-link" href="#content">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
