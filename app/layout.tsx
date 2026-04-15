import type { Metadata } from "next";
import { Oswald, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`h-full ${oswald.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
