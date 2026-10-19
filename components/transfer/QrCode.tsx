"use client";

import { useMemo } from "react";
import qrcode from "qrcode-generator";

/** The blank border around the code, in modules. A scanner needs it, so it is part of the picture. */
const QUIET_ZONE = 4;

/** The picture of a QR code as one path: a run of dark modules in a row is one rectangle. */
function pathOf(text: string): { size: number; path: string } {
  const code = qrcode(0, "L");
  code.addData(text);
  code.make();
  const size = code.getModuleCount();
  const parts: string[] = [];
  for (let row = 0; row < size; row += 1) {
    let column = 0;
    while (column < size) {
      if (!code.isDark(row, column)) {
        column += 1;
        continue;
      }
      const start = column;
      while (column < size && code.isDark(row, column)) column += 1;
      parts.push(`M${start} ${row}h${column - start}v1h-${column - start}z`);
    }
  }
  return { size, path: parts.join("") };
}

/** A QR code drawn on this page from the text, with no outside service. Always dark on white, as scanners need. */
export function QrCode({ text, label }: { text: string; label: string }) {
  const { size, path } = useMemo(() => pathOf(text), [text]);
  const side = size + QUIET_ZONE * 2;
  return (
    <svg
      className="qr"
      viewBox={[0, 0, side, side].join(" ")}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={side} height={side} fill="#ffffff" />
      <path d={path} fill="#000000" transform={`translate(${QUIET_ZONE} ${QUIET_ZONE})`} />
    </svg>
  );
}
