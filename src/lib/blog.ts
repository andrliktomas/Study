import { readFile, readdir } from "fs/promises";
import path from "path";
import { marked } from "marked";

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  audience: "studenti" | "lektori";
  readingMinutes: number;
  html: string;
};

const DIR = path.join(process.cwd(), "content/blog");

/** Jednoduchý frontmatter: klíč: hodnota mezi řádky --- */
function parse(source: string) {
  const m = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error("Článek nemá frontmatter");
  const meta = Object.fromEntries(
    m[1].split("\n").map((line) => {
      const i = line.indexOf(":");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
  );
  return { meta, body: m[2] };
}

export async function getPosts(): Promise<Post[]> {
  const files = (await readdir(DIR)).filter((f) => f.endsWith(".md"));
  const posts = await Promise.all(files.map((f) => getPost(f.replace(/\.md$/, ""))));
  return posts.filter((p): p is Post => p !== null).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPost(slug: string): Promise<Post | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const { meta, body } = parse(await readFile(path.join(DIR, `${slug}.md`), "utf8"));
    const words = body.split(/\s+/).length;
    return {
      slug,
      title: meta.title,
      description: meta.description,
      date: meta.date,
      audience: meta.audience === "lektori" ? "lektori" : "studenti",
      readingMinutes: Math.max(1, Math.round(words / 200)),
      html: marked.parse(body, { async: false }) as string,
    };
  } catch {
    return null;
  }
}
