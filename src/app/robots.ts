import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/api/", "/pozvanka/", "/reset-hesla/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
