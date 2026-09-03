import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/login", "/signup", "/profile"],
      },
    ],
    sitemap: "https://utilityos.tech/sitemap.xml",
  };
}
