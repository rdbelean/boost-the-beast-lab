import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Oswald, Inter, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import CookieBanner from "@/components/CookieBanner";
import { routing } from "@/i18n/routing";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://boostthebeast-lab.com"),
  title: "BOOST THE BEAST LAB – Performance Intelligence System",
  description:
    "Performance Diagnostik auf wissenschaftlichem Niveau. Analysiere Metabolismus, Recovery, Aktivität und Stress – ohne Labor, ohne Wartezeit.",
  openGraph: {
    title: "BOOST THE BEAST LAB",
    description: "Dein Körper. Deine Daten. Dein Level.",
    type: "website",
    url: "https://boostthebeast-lab.com",
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`h-full ${oswald.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <NextIntlClientProvider>
          {children}
          <CookieBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
