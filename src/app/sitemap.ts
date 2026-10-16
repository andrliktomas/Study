import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { LANGUAGES } from "@/lib/languages";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tutors = await db.tutorProfile.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } });
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/lektori"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/pro-lektory"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/cenik"), changeFrequency: "monthly", priority: 0.6 },
    ...LANGUAGES.map((l) => ({ url: absoluteUrl(`/jazyky/${l.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...tutors.map((t) => ({ url: absoluteUrl(`/lektori/${t.slug}`), lastModified: t.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
