import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
// import { getMessages } from "next-intl/server";

import "../globals.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://weather-app-eta-six-12.vercel.app/"),

  title: "Weather App",
  description:
    "A modern weather application that provides real-time weather conditions and a detailed 5-day forecast. Search for any city worldwide and stay updated with accurate, easy-to-read weather insights.",

  icons: {
    icon: "/Headerlogo.png",
    shortcut: "/Headerlogo.png",
    apple: "/Headerlogo.png",
  },

  openGraph: {
    type: "website",
    title: "Weather App",
    siteName: "Weather App",
    description:
      "A modern weather application that provides real-time weather conditions and a detailed 5-day forecast. Search for any city worldwide and stay updated with accurate, easy-to-read weather insights.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Weather App Preview",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Weather App",
    description:
      "A modern weather application that provides real-time weather conditions and a detailed 5-day forecast. Search for any city worldwide and stay updated with accurate, easy-to-read weather insights.",
    images: ["/og.png"],
  },
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const safeLocale = locale === "ar" ? "ar" : "en";
  const messages = (await import(`../../messages/${safeLocale}.json`)).default;

  const isArabic = safeLocale === "ar";

  return (
    <html lang={safeLocale} dir={isArabic ? "rtl" : "ltr"}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider locale={safeLocale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

