import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Oswald, Inter, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import CookieBanner from "@/components/CookieBanner";
import { routing } from "@/i18n/routing";

const SITE_URL = "https://boostthebeast-lab.com";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return {
      metadataBase: new URL(SITE_URL),
    };
  }
  const t = await getTranslations({ locale, namespace: "seo" });
  const alternates: Record<string, string> = {};
  for (const loc of routing.locales) {
    alternates[loc] = `/${loc}`;
  }
  alternates["x-default"] = `/${routing.defaultLocale}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: t("default_title"),
    description: t("default_description"),
    alternates: {
      canonical: `/${locale}`,
      languages: alternates,
    },
    openGraph: {
      title: t("og_title"),
      description: t("og_description"),
      type: "website",
      url: `${SITE_URL}/${locale}`,
      locale,
    },
  };
}

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
