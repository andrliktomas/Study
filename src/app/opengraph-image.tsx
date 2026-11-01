import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export const alt = "Lektorium – platforma pro online lektory jazyků";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Online výuka jazyků bez chaosu v tabulkách</div>
          <div style={{ fontSize: 34, color: "#46636a" }}>Studenti, balíčky lekcí, platby a Google Kalendář na jednom místě.</div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {["Bez provize z lekcí", "Platby převodem i ze zahraničí", "Rezervace online"].map((t) => (
            <div key={t} style={{ fontSize: 26, padding: "10px 22px", borderRadius: 999, background: "#ffffff", border: "2px solid #a5f3fc", color: "#0f7579" }}>{t}</div>
          ))}
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
