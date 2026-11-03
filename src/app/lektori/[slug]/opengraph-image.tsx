import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { languageByCode, parseList } from "@/lib/languages";
import { OG_SIZE, OgFrame, ogAvatarSrc, ogFonts } from "@/lib/og";
import { publicTutorWhere } from "@/lib/tutors";

export const alt = "Profil lektora";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await db.tutorProfile.findFirst({
    where: { slug, ...publicTutorWhere() },
    include: { user: { select: { name: true, image: true } }, packages: { where: { active: true, isTrial: false } }, reviews: { where: { hidden: false }, select: { rating: true } } },
  });
  const fonts = await ogFonts();
  if (!t) {
    return new ImageResponse(<OgFrame><div style={{ fontSize: 64, fontWeight: 800 }}>Online lektoři jazyků</div></OgFrame>, { ...size, fonts });
  }
  const avatar = await ogAvatarSrc(t.user.image);
  const langs = parseList(t.languages).map((c) => languageByCode(c)?.name).filter(Boolean);
  const cheapest = t.packages.reduce<number | null>((min, p) => {
    const per = Math.round(p.priceCents / p.lessonCount);
    return min === null || per < min ? per : min;
  }, null);
  const rating = t.reviews.length ? t.reviews.reduce((s, r) => s + r.rating, 0) / t.reviews.length : null;
  const initials = (t.user.name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("");

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          {avatar ? (
            <img src={avatar} width={220} height={220} style={{ borderRadius: 999, border: "8px solid white", objectFit: "cover" }} alt="" />
          ) : (
            <div style={{ width: 220, height: 220, borderRadius: 999, background: "#14b8b8", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 96, fontWeight: 800 }}>
              {initials}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
            <div style={{ fontSize: 68, fontWeight: 800, letterSpacing: -1.5 }}>{t.user.name}</div>
            <div style={{ fontSize: 32, color: "#46636a" }}>{t.headline || "Online lektor jazyků"}</div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              {langs.slice(0, 3).map((l) => (
                <div key={l} style={{ fontSize: 26, padding: "8px 20px", borderRadius: 999, background: "white", border: "2px solid #a5f3fc", color: "#0f7579" }}>{l}</div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 40, fontSize: 32 }}>
          {cheapest !== null && <div style={{ display: "flex" }}>od&nbsp;<b style={{ fontWeight: 800 }}>{formatMoney(cheapest)}</b>&nbsp;/ lekce</div>}
          {rating !== null && <div style={{ display: "flex", color: "#b45309" }}>★ {rating.toFixed(1).replace(".", ",")} ({t.reviews.length})</div>}
        </div>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
