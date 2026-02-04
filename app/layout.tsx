import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
  title: {
    default: "Weather App",
    template: "%s | Weather App",
  },
  description: "A modern weather app showing current conditions and a 5-day forecast.",

  icons: {
    icon: "/icon2.png",
    shortcut: "/icon.ico",
    apple: "/apple-touch-icon.png",
  },

  openGraph: {
    title: "Weather App",
    description: "Check current weather conditions and a 5-day forecast for any city.",
    url: "https://weather-app-eta-six-12.vercel.app/",
    siteName: "Weather App",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Weather App Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Weather App",
    description: "Check current weather conditions and a 5-day forecast for any city.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
