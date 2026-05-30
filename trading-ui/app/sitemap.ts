import type { MetadataRoute } from "next";
import { SUPPORTED_MARKETS } from "@/lib/markets";

const siteUrl = "https://www.stockwin.win";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/signup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...SUPPORTED_MARKETS.map(market => ({
      url: `${siteUrl}/markets/${market.symbol.toLowerCase()}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
  ];
}
