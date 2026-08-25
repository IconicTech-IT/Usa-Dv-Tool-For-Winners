"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useUser } from "@/lib/store/user-store";

/**
 * ⚠️ تلات أسئلة مختلفة، متخلطهمش في سويتش واحد:
 *
 *   useReducedMotion() → المستخدم عايز حركة أقل؟ (إعداد النظام + إعداده هنا)
 *   useTilt()          → الجهاز أصلًا فيه ماوس يميل الكارت بيه؟
 *   useGlassGuard()    → الجهاز ضعيف فنطفي الglass؟
 *
 * الغلطة اللي كانت هنا: اعتبار أي جهاز touch = "عايز حركة أقل".
 * ده كان بيطفي العدادات وختم الشيك ليست على الموبايل — وأغلب
 * مستخدمين الموقع على موبايل، يعني الحركة كانت هتتشال من عند أغلب الناس.
 */

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** إعداد النظام + إعداد المستخدم في الموقع. بيشتغل على الموبايل زي الديسكتوب. */
export function useReducedMotion(): boolean {
  const systemPref = useMediaQuery("(prefers-reduced-motion: reduce)");
  const userPref = useUser((s) => s.prefs.reducedMotion);
  return systemPref || userPref;
}

/** الميل ثلاثي الأبعاد للكارت — محتاج ماوس فعلي، ومحتاج المستخدم مش طالب حركة أقل. */
export function useTilt(): boolean {
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduced = useReducedMotion();
  return finePointer && !reduced;
}

/** أجهزة ضعيفة: نطفي الglass بدل ما الموقع يهنّج. */
export function useGlassGuard() {
  useEffect(() => {
    if ((navigator.hardwareConcurrency ?? 8) <= 4) {
      document.documentElement.classList.add("no-glass");
    }
  }, []);
}

/**
 * ⚠️ أهم helper في الملف ده.
 * أي حركة أفقية لازم تعدي من هنا، وإلا في العربي هتطلع من الناحية الغلط
 * وهتحس إن الصفحة بتمشي لورا.
 *
 *   const dir = useDirection();
 *   <motion.div initial={{ x: 24 * dir, opacity: 0 }} animate={{ x: 0, opacity: 1 }} />
 */
export function useDirection(): 1 | -1 {
  return useLocale() === "ar" ? -1 : 1;
}

export const DURATION = {
  micro: 180,
  base: 280,
  page: 200,
  counter: 1200,
  chart: 1200,
} as const;
