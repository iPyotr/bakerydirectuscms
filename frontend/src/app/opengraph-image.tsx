import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchGlobals } from "@/lib/api";

export const alt = "Дело вкуса — пекарня, кулинария и полуфабрикаты";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Re-generate when Directus webhook fires revalidatePath("/", "layout").
export const revalidate = 300;

export default async function Image() {
  const [logoSvg, globals] = await Promise.all([
    readFile(join(process.cwd(), "public/ico/brand-mark.svg"), "utf-8"),
    fetchGlobals(),
  ]);
  const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;

  const addressLine = `${globals.addressShort} · ${globals.workingHours}`;
  const siteHost = (process.env.SITE_URL ?? "https://delovkusa.openlabio.ru")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(circle at 85% 10%, rgba(239,194,83,0.38), transparent 55%), radial-gradient(circle at 10% 85%, rgba(214,41,41,0.16), transparent 50%), linear-gradient(135deg, #f7f4f1 0%, #eae6e1 100%)",
          padding: "80px 90px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative bokeh circles */}
        <div
          style={{
            position: "absolute",
            right: -120,
            top: -120,
            width: 420,
            height: 420,
            borderRadius: 9999,
            background:
              "radial-gradient(circle at 35% 35%, #ffd68d 0%, #c87127 35%, #8b4316 60%, #6a3714 100%)",
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 220,
            top: 80,
            width: 180,
            height: 180,
            borderRadius: 9999,
            background:
              "radial-gradient(circle at 35% 35%, #ffe1a3 0%, #d98b34 40%, #8b491a 100%)",
            opacity: 0.55,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 420,
            top: 260,
            width: 120,
            height: 120,
            borderRadius: 9999,
            background:
              "radial-gradient(circle at 30% 30%, #fff6dc 0%, #e3c387 24%, #9a5a2b 60%, #724018 100%)",
            opacity: 0.55,
          }}
        />

        {/* Logo wordmark */}
        <img
          src={logoDataUri}
          alt=""
          width={420}
          height={50}
          style={{ height: 70, width: "auto" }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            marginBottom: 30,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              lineHeight: 0.98,
              letterSpacing: "-3px",
              color: "#23201d",
            }}
          >
            Свежая выпечка
          </div>
          <div
            style={{
              fontSize: 84,
              fontStyle: "italic",
              fontWeight: 500,
              lineHeight: 1,
              marginTop: 10,
              letterSpacing: 1,
              color: "#d4a93d",
            }}
          >
            каждый день
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 28,
            borderTop: "2px solid rgba(35,32,29,0.12)",
            color: "#6b645c",
            fontSize: 26,
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 9999,
                background: "#efc253",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#533900",
                fontSize: 34,
                fontWeight: 800,
              }}
            >
              🥐
            </div>
            <span>{addressLine}</span>
          </div>
          <span style={{ color: "#d62929", fontWeight: 800 }}>{siteHost}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
