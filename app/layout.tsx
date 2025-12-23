import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { getLocalBusinessSchema } from "../lib/metadata";
import ConditionalLayout from "../components/ConditionalLayout";

const headingFont = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "The Watershed Campground | Lakeside Camping on Kootenay Lake",
    template: "%s | The Watershed Campground",
  },
  description: "Peaceful lakeside camping on Kootenay Lake. Family-owned campground offering RV sites, car camping, and tent sites with modern amenities.",
  keywords: [
    "campground",
    "camping",
    "RV park",
    "Kootenay Lake",
    "Balfour BC",
    "lakeside camping",
    "tent camping",
    "British Columbia camping",
    "family campground",
    "fishing",
    "swimming",
  ],
  authors: [{ name: "The Watershed Campground" }],
  creator: "The Watershed Campground",
  metadataBase: new URL("https://thewatershedcampground.com"),
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: "https://thewatershedcampground.com",
    title: "The Watershed Campground | Lakeside Camping on Kootenay Lake",
    description: "Peaceful lakeside camping on Kootenay Lake. Family-owned campground offering RV sites, car camping, and tent sites with modern amenities.",
    siteName: "The Watershed Campground",
    images: [
      {
        url: "/gallery/banner.avif",
        width: 1200,
        height: 630,
        alt: "The Watershed Campground",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Watershed Campground | Lakeside Camping on Kootenay Lake",
    description: "Peaceful lakeside camping on Kootenay Lake. Family-owned campground offering RV sites, car camping, and tent sites with modern amenities.",
    images: ["/gallery/banner.avif"],
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = getLocalBusinessSchema();

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#06251c" />
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${headingFont.variable} ${bodyFont.variable} antialiased bg-brand-forest text-accent-beige`}>
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
      </body>
    </html>
  );
}
