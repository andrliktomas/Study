import type { MetadataRoute } from "next";
import { absoluteUrl, demoMode } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // ukázková verze s testovacími daty se nemá dostat do vyhledávačů
  if (demoMode) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/api/", "/pozvanka/", "/reset-hesla/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
