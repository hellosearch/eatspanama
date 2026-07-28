import { SITE_URL } from "@/lib/seo";

/**
 * "Photo-forward" social card (direction A): the venue/hood photo fills the
 * 1200x630 frame under a scrim, with the EatsPanama wordmark top-left, an
 * optional tag top-right, and the title + meta bottom-left. Satori-safe: every
 * container is display:flex, positions use left+width (no left+right), and text
 * uses the vendored Space Grotesk / Inter families.
 */
const ACCENT = "#ff5a1f";
const INK = "#181512";
const W = 1200;
const H = 630;
const PAD = 60;

export interface OgCardInput {
  title: string;
  meta: string;
  /** Root-relative (/venues/x.jpg) or absolute URL. Omit for a branded ink card. */
  photo?: string;
  /** Small pill top-right (e.g. "Editors' pick", "Neighborhood"). */
  tag?: string;
}

export function ogCard({ title, meta, photo, tag }: OgCardInput) {
  const bg = photo ? (photo.startsWith("http") ? photo : `${SITE_URL}${photo}`) : undefined;
  // Long names step down so they never overflow the frame.
  const titleSize = title.length > 30 ? 60 : title.length > 20 ? 74 : 92;
  const innerW = W - PAD * 2;

  return (
    <div
      style={{
        display: "flex",
        width: `${W}px`,
        height: `${H}px`,
        position: "relative",
        backgroundColor: INK,
        fontFamily: "Inter",
      }}
    >
      {bg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bg}
          width={W}
          height={H}
          style={{ position: "absolute", top: 0, left: 0, width: `${W}px`, height: `${H}px`, objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${W}px`,
            height: `${H}px`,
            display: "flex",
            backgroundImage: `radial-gradient(60% 60% at 80% 0%, rgba(255,90,31,0.28), rgba(24,21,18,0) 60%)`,
          }}
        />
      )}

      {/* scrim for legibility */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${W}px`,
          height: `${H}px`,
          display: "flex",
          backgroundImage: "linear-gradient(0deg, rgba(9,6,5,0.9) 0%, rgba(9,6,5,0.12) 44%, rgba(9,6,5,0.42) 100%)",
        }}
      />

      {/* top row: wordmark + optional tag */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: PAD,
          width: `${innerW}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 36, letterSpacing: -0.5 }}>
          <div style={{ display: "flex", color: "#fff" }}>Eats</div>
          <div style={{ display: "flex", color: ACCENT }}>Panama</div>
        </div>
        {tag ? (
          <div
            style={{
              display: "flex",
              fontFamily: "Space Grotesk",
              fontWeight: 700,
              fontSize: 21,
              letterSpacing: 1,
              backgroundColor: ACCENT,
              color: "#fff",
              padding: "9px 20px",
              borderRadius: 12,
            }}
          >
            {tag}
          </div>
        ) : null}
      </div>

      {/* bottom: title + meta */}
      <div style={{ position: "absolute", left: PAD, bottom: 54, width: `${innerW}px`, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Space Grotesk",
            fontWeight: 700,
            fontSize: titleSize,
            lineHeight: 1,
            letterSpacing: -2,
            color: "#fff",
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 31, fontWeight: 600, color: "rgba(255,255,255,0.92)", marginTop: 18 }}>
          {meta}
        </div>
      </div>

      {/* thin tangerine baseline accent */}
      <div style={{ position: "absolute", left: 0, bottom: 0, width: `${W}px`, height: 8, display: "flex", backgroundColor: ACCENT }} />
    </div>
  );
}
