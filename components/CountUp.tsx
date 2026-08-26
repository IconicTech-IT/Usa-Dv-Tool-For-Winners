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
  immediate = false,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  /**
   * ⚠️ للعناصر الملزوقة في أول الشاشة.
   *
   * `useInView` بيستخدم `rootMargin: "-10% 0px"` عشان الحركة تبدأ بعد ما
   * العنصر يدخل جوه الصفحة شوية. بس عنصر `sticky` عند `top: 0` بيقعد
   * **جوه الـ١٠٪ المستثناة دي طول الوقت**، فبيفضل "مش ظاهر" للأبد
   * والعداد يقف على صفر — وشريط الخطة كان بيقول "فلوسك تكفي 0.0 شهر"
   * مهما كان معاك كام.
   */
  immediate?: boolean;
}) {
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLSpanElement>();
  const start = immediate || inView;

  /**
   * ⚠️ بيبدأ بالرقم الصح، مش بصفر.
   *
   * كان بيبدأ صفر ويستنى الحركة تعدّه. يعني لو الحركة ماشتغلتش لأي سبب —
   * العنصر مش داخل نطاق `useInView`، أو المتصفح وقّف الحركة — المستخدم
   * يشوف **صفر** مكان رقمه. وده اللي حصل في شريط الخطة: "فلوسك تكفي
   * 0.0 شهر" وهو معاه ٢٠ ألف.
   *
   * القاعدة: الزينة ممكن متشتغلش، لكن الرقم لازم يفضل صح.
   */
  const [shown, setShown] = useState(value);
  const proxy = useRef({ n: value });

  useEffect(() => {
    if (reduced || !start) {
      setShown(value);
      return;
    }

    const obj = proxy.current;
    obj.n = 0;
    setShown(0);

    const animation = animate(obj, {
      n: value,
      duration: DURATION.counter,
      ease: "outExpo",
      onUpdate: () => setShown(obj.n),
      onComplete: () => setShown(value),
    });

    /**
     * ⚠️ شبكة أمان: لو الحركة ماشتغلتش خالص، الرقم يرجع صح لوحده.
     *
     * ده اللي حصل في شريط الخطة — الحركة مابدأتش، فالعداد فضل واقف على
     * الصفر اللي حطيناه قبل ما نبدأ، والمستخدم شاف "فلوسك تكفي 0.0 شهر"
     * وهو معاه ٢٠ ألف. **رقم غلط أسوأ من حركة ناقصة**، فلو الحركة
     * خلصت وقتها ولسه الرقم مش وصل، بنحطه بالإيد.
     */
    const safety = setTimeout(() => setShown(value), DURATION.counter + 300);

    return () => {
      animation.pause();
      clearTimeout(safety);
      setShown(value);
    };
  }, [value, reduced, start]);

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
