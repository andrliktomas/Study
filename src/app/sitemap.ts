import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { LANGUAGES } from "@/lib/languages";
import { publicTutorWhere } from "@/lib/tutors";
import { getPosts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tutors = await db.tutorProfile.findMany({ where: publicTutorWhere(), select: { slug: true, updatedAt: true } });
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/lektori"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/pro-lektory"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/cenik"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/blog"), changeFrequency: "weekly", priority: 0.7 },
    ...(await getPosts()).map((p) => ({ url: absoluteUrl(`/blog/${p.slug}`), lastModified: new Date(p.date), changeFrequency: "monthly" as const, priority: 0.6 })),
    { url: absoluteUrl("/obchodni-podminky"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/ochrana-osobnich-udaju"), changeFrequency: "yearly", priority: 0.2 },
    ...LANGUAGES.map((l) => ({ url: absoluteUrl(`/jazyky/${l.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...tutors.map((t) => ({ url: absoluteUrl(`/lektori/${t.slug}`), lastModified: t.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
