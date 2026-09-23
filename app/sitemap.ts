import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";

// /admin and /order are deliberately excluded here (and disallowed in
// robots.ts): the order success page reads from the database and admin
// routes are auth-gated, neither belongs in a public sitemap.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/story",
    "/promotion",
    "/products",
    "/contact",
    "/faq",
    "/cart",
    "/privacy",
    "/terms",
    "/refund",
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
  }));
}
