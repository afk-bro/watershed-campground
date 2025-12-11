import type { Metadata } from "next";

export const siteConfig = {
  name: "The Watershed Campground",
  description: "Peaceful lakeside camping on Kootenay Lake. Family-owned campground offering RV sites, car camping, and tent sites with modern amenities.",
  url: "https://thewatershedcampground.com",
  ogImage: "/gallery/banner.avif",
  phone: "250-878-6101",
  email: "info@thewatershedcampground.com",
  address: {
    street: "7042 Lee Road",
    city: "Balfour",
    province: "BC",
    postalCode: "V1L 6R9",
    country: "Canada",
  },
  social: {
    facebook: "https://facebook.com", // TODO: Update with real URL
    instagram: "https://instagram.com", // TODO: Update with real URL
  },
};

export function createMetadata({
  title,
  description,
  path = "",
  image,
  noIndex = false,
}: {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const metaDescription = description || siteConfig.description;
  const metaImage = image || siteConfig.ogImage;
  const url = `${siteConfig.url}${path}`;

  return {
    title: `${title} | ${siteConfig.name}`,
    description: metaDescription,
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
    authors: [{ name: siteConfig.name }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      locale: "en_CA",
      url,
      title,
      description: metaDescription,
      siteName: siteConfig.name,
      images: [
        {
          url: metaImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: metaDescription,
      images: [metaImage],
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

// Structured data for local business (JSON-LD)
export function getLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Campground",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    telephone: siteConfig.phone,
    email: siteConfig.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.address.street,
      addressLocality: siteConfig.address.city,
      addressRegion: siteConfig.address.province,
      postalCode: siteConfig.address.postalCode,
      addressCountry: siteConfig.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "49.7167", // Approximate coordinates for Balfour, BC
      longitude: "-116.9167",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "00:00",
      closes: "23:59",
    },
    priceRange: "$39-$65",
    amenityFeature: [
      {
        "@type": "LocationFeatureSpecification",
        name: "Full RV Hookups",
        value: true,
      },
      {
        "@type": "LocationFeatureSpecification",
        name: "Lakefront Access",
        value: true,
      },
      {
        "@type": "LocationFeatureSpecification",
        name: "Fire Pits",
        value: true,
      },
      {
        "@type": "LocationFeatureSpecification",
        name: "Picnic Tables",
        value: true,
      },
    ],
    sameAs: [siteConfig.social.facebook, siteConfig.social.instagram],
  };
}
