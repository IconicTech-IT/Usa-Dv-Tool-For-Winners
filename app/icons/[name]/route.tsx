import { ImageResponse } from "next/og";

/** The app icons, drawn at build time from one design: a compass on the brand colour. */

const BRAND = "#0F766E";
const WHITE = "#FFFFFF";

interface IconSpec {
  size: number;
  /** Full-bleed colour with the compass inside the safe zone, for icons the system crops itself. */
  fullBleed: boolean;
}

const ICONS: Record<string, IconSpec> = {
  "icon-192.png": { size: 192, fullBleed: false },
  "icon-512.png": { size: 512, fullBleed: false },
  "icon-maskable-512.png": { size: 512, fullBleed: true },
  "apple-touch-icon.png": { size: 180, fullBleed: true },
};

/** Share of the icon the compass fills: smaller on crop-by-system icons so nothing is cut off. */
const COMPASS_SHARE = { rounded: 0.66, fullBleed: 0.54 } as const;
/** How round the corners of a regular icon are, as a share of its size. */
const CORNER_SHARE = 0.22;

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const spec = ICONS[name];
  if (!spec) return new Response("Not found", { status: 404 });

  const compass = Math.round(spec.size * (spec.fullBleed ? COMPASS_SHARE.fullBleed : COMPASS_SHARE.rounded));
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND,
        borderRadius: spec.fullBleed ? 0 : Math.round(spec.size * CORNER_SHARE),
      }}
    >
      <svg width={compass} height={compass} viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="1.6">
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5l-2.2 5.3-5.3 2.2 2.2-5.3z" fill={WHITE} stroke="none" />
      </svg>
    </div>,
    { width: spec.size, height: spec.size },
  );
}
