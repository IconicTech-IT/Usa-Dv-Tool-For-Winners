"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { useReducedMotion, useInView, DURATION } from "@/lib/motion";
import { Num } from "./Num";

/**
 * عدّاد بيعد لغاية الرقم مرة واحدة أول ما يظهر.
 * بيشتغل على الموبايل عادي — الحركة بتتعطل بس لو المستخدم طالب حركة أقل.
 */
export function CountUp({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
}) {
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(reduced ? value : 0);
  const proxy = useRef({ n: 0 });

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    if (!inView) return;

    const obj = proxy.current;
    const animation = animate(obj, {
      n: value,
      duration: DURATION.counter,
      ease: "outExpo",
      onUpdate: () => setShown(obj.n),
      onComplete: () => setShown(value),
    });

    return () => {
      animation.pause();
    };
  }, [value, reduced, inView]);

  // ⚠️ `toFixed` لوحدها بتطلع "5974" جنب تفصيل مكتوب فيه "$3,468" —
  // نفس الصفحة ونفس نوع الرقم بشكلين. كل رقم فلوس في الموقع بفاصلة آلاف.
  const text = shown.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <Num ref={ref}>
      {prefix}
      {text}
      {suffix}
    </Num>
  );
}
