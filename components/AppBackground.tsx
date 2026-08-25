"use client";

import { useGlassGuard } from "@/lib/motion";

/**
 * الطبقة اللي الglass بيعمللها blur. من غيرها الكارت بيبقى مجرد كارت باهت.
 * بقعة الضوء بتتحرك ببطء شديد (GSAP في المرحلة ٥) وبتقف مع reduced-motion.
 */
export function AppBackground() {
  useGlassGuard();

  return (
    <div className="app-bg" aria-hidden="true">
      <div
        className="app-bg__glow"
        style={{ insetInlineStart: "10%", insetBlockStart: "-10%" }}
      />
    </div>
  );
}
