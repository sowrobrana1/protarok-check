import type { MetadataRoute } from "next";

const BASE = "https://protarok-check.vercel.app";

// Public pages are crawlable (number profiles should be found on Google);
// the admin panel and APIs are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
