import { MetadataRoute } from "next";
import { siteConfig } from "../lib/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
    const routes = [
        {
            url: siteConfig.url,
            lastModified: new Date(),
            changeFrequency: "weekly" as const,
            priority: 1,
        },
        {
            url: `${siteConfig.url}/gallery`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.8,
        },
        {
            url: `${siteConfig.url}/rates`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.9,
        },
        {
            url: `${siteConfig.url}/amenities`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.8,
        },
        {
            url: `${siteConfig.url}/things-to-do`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.7,
        },
        {
            url: `${siteConfig.url}/contact`,
            lastModified: new Date(),
            changeFrequency: "yearly" as const,
            priority: 0.8,
        },
        {
            url: `${siteConfig.url}/make-a-reservation`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.9,
        },
        {
            url: `${siteConfig.url}/rules`,
            lastModified: new Date(),
            changeFrequency: "yearly" as const,
            priority: 0.6,
        },
    ];

    return routes;
}
