import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { navLinks } from "../lib/navLinks";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const headingFont = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Watershed Campground",
  description: "Peaceful riverside camping with modern amenities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${bodyFont.variable} antialiased bg-brand-forest text-accent-beige`}>
        <Navbar links={navLinks} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
