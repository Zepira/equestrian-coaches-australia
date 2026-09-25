import { ImageResponse } from "next/og";

/**
 * Share images (The Marketing Engine M4): the social preview for every
 * profile, event and area page, and the square and story versions a
 * professional downloads from "Promote yourself". Photo, name, what they do,
 * where, and "Find me on Equine Professionals Australia", in the brand's
 * ink and serif; the horse care door gets its sky accent.
 */
export type ShareFormat = "og" | "square" | "story";
const SIZES: Record<ShareFormat, { width: number; height: number }> = {
  og: { width: 1200, height: 630 },
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
};

export const parseFormat = (v: string | null): ShareFormat => (v === "square" || v === "story" ? v : "og");

let serif: ArrayBuffer | null | undefined;
/** Instrument Serif from Google Fonts, fetched once; null (the default face) if that fails. */
async function loadSerif(): Promise<ArrayBuffer | null> {
  if (serif !== undefined) return serif;
  try {
    const css = await fetch("https://fonts.googleapis.com/css2?family=Instrument+Serif", { headers: { "user-agent": "Mozilla/4.0" } }).then((r) => r.text());
    const url = css.match(/src: url\((https:[^)]+\.ttf)\)/)?.[1];
    serif = url ? await fetch(url).then((r) => r.arrayBuffer()) : null;
  } catch {
    serif = null;
  }
  return serif ?? null;
}

export async function shareImage({
  format,
  eyebrow,
  title,
  lines,
  photo,
  footer = "Find me on Equine Professionals Australia",
  horseCare = false,
  badge,
}: {
  format: ShareFormat;
  eyebrow: string;
  title: string;
  lines: string[];
  photo: string | null;
  footer?: string;
  horseCare?: boolean;
  /** A ribbon in the corner: "Founding member". */
  badge?: string;
}) {
  const { width, height } = SIZES[format];
  const font = await loadSerif();
  const accent = horseCare ? "#A9C4DA" : "#E8B79A";
  const tall = format === "story";
  const wide = format === "og";
  const photoBox = wide ? { width: 460, height } : { width, height: tall ? 1100 : 560 };
  const titleSize = Math.min(wide ? 84 : 112, Math.floor((wide ? 1500 : 2000) / Math.max(title.length, 8)));

  return new ImageResponse(
    (
      <div style={{ width, height, display: "flex", flexDirection: wide ? "row-reverse" : "column", background: "#14281f", color: "#F6F1E7", fontFamily: "Serif" }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" width={photoBox.width} height={photoBox.height} style={{ objectFit: "cover", width: photoBox.width, height: photoBox.height }} />
        ) : (
          <div style={{ width: photoBox.width, height: photoBox.height, background: "#1F3A2E", display: "flex" }} />
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: wide ? "64px 56px" : "72px 72px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: wide ? 26 : 34, letterSpacing: 4, textTransform: "uppercase", color: accent, fontFamily: "sans-serif", display: "flex" }}>{eyebrow}</div>
            <div style={{ fontSize: titleSize, lineHeight: 1.02, marginTop: 20, display: "flex" }}>{title}</div>
            {lines.map((l) => (
              <div key={l} style={{ fontSize: wide ? 30 : 40, marginTop: 14, color: "rgba(246,241,231,0.78)", fontFamily: "sans-serif", display: "flex" }}>
                {l}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: wide ? 30 : 40, color: accent, display: "flex" }}>{footer}</div>
            {badge && (
              <div style={{ fontSize: wide ? 22 : 30, padding: "10px 20px", borderRadius: 999, background: accent, color: "#14281f", fontFamily: "sans-serif", display: "flex" }}>{badge}</div>
            )}
          </div>
        </div>
      </div>
    ),
    { width, height, fonts: font ? [{ name: "Serif", data: font, style: "normal", weight: 400 }] : undefined, headers: { "cache-control": "public, max-age=3600, s-maxage=86400" } }
  );
}
