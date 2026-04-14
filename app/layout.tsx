import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="de" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
