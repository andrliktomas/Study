import { readFile } from "fs/promises";
import path from "path";
import { db } from "./db";

export const OG_SIZE = { width: 1200, height: 630 };

export async function ogFonts() {
  const dir = path.join(process.cwd(), "src/assets/fonts");
  const [medium, bold] = await Promise.all([readFile(path.join(dir, "Inter-Medium.ttf")), readFile(path.join(dir, "Inter-ExtraBold.ttf"))]);
  return [
    { name: "Inter", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "Inter", data: bold, weight: 800 as const, style: "normal" as const },
  ];
}

/** Avatar pro OG obrázek: vlastní fotka z DB jako data URI, jinak externí URL (Google). */
export async function ogAvatarSrc(image: string | null | undefined) {
  if (!image) return null;
  const m = image.match(/^\/api\/soubory\/([\w-]+)/);
  if (m) {
    const f = await db.storedFile.findUnique({ where: { id: m[1] }, select: { data: true, mimeType: true } });
    return f ? `data:${f.mimeType};base64,${Buffer.from(f.data).toString("base64")}` : null;
  }
  return image.startsWith("http") ? image : null;
}

export function OgFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "linear-gradient(135deg, #ffffff 0%, #ecfeff 55%, #a5f3fc 100%)",
        fontFamily: "Inter",
        color: "#0f2a2e",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "#14b8b8", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 34, fontWeight: 800 }}>
          L
        </div>
        <span style={{ fontSize: 34, fontWeight: 800 }}>Lektorium</span>
      </div>
      {children}
    </div>
  );
}
