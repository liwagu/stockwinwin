import type { MetadataRoute } from "next";

const siteUrl = "https://www.stockwin.win";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
