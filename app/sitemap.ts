import type { MetadataRoute } from "next";

// /admin and /order are deliberately excluded here (and disallowed in
// robots.ts): the order success page reads from the database and admin
// routes are auth-gated, neither belongs in a public sitemap.
//
// /terms is not listed because the route does not exist yet - add it once
// app/terms/page.tsx ships (audit 1.2).
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const routes = ["", "/privacy", "/refund"];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
  }));
}
