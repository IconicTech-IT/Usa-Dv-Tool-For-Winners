"use client";

/**
 * الكارت الأساسي للموقع كله. متعملش كارت تاني من الأول.
 *
 * - glass + شريط جانبي بيقول الحالة (logical property فبيتقلب لوحده في RTL)
 * - هولوجرام بيتبع الماوس
 * - ميل ثلاثي الأبعاد بحد أقصى ٦ درجات، على الأجهزة اللي فيها ماوس بس
 * - رجوع لمكانه بـanime.js
 * - على الموبايل: ضغطة فيها scale سريعة بدل الميل
 * - بيتعطل بالكامل مع prefers-reduced-motion أو على أجهزة ضعيفة
 *
 * ⚠️ **الميل بيحرّك حدود الكارت نفسه — ودي كانت مصدر تلات باجات مع بعض
 * عند الحواف والأركان:**
 *
 * ١. الميل بيزيح سطح الكارت من تحت الماوس، فالمتصفح بيبعت `pointerleave`
 *    والماوس لسه مكانه. الرجوع بيشتغل، الكارت يرجع تحت الماوس،
 *    `pointermove` يشتغل تاني، ييل تاني، يخرج تاني — رفرفة لا نهائية
 *    عند الحافة بالظبط.
 * ٢. الرجوع فيه `outElastic` بيعدي مكانه الأصلي ويرجع، فالحافة بتمسح
 *    على الماوس مرتين تلاتة في كل رجعة وتولّد نفس الحلقة.
 * ٣. `getBoundingClientRect()` بترجع المستطيل **بعد** الميل، فحساب
 *    موقع الماوس كان بيتغذى على نتيجته: تيل شوية → المستطيل يتغير →
 *    النسبة تتغير → تيل أكتر. تذبذب واضح في الأركان لأن المحورين
 *    بيعملوا كده مع بعض.
 *
 * الحل: القياس دايمًا من المستطيل **من غير أي transform**، و`pointerleave`
 * اللي الماوس لسه جواه بيتعتبر خروج وهمي من صنعنا فبيتتجاهل.
 */

import { useRef, useCallback, type ReactNode } from "react";
import { animate, type JSAnimation } from "animejs";
import { useTilt, useReducedMotion } from "@/lib/motion";

type Status = "done" | "now" | "later" | "danger" | "none";

interface CardProps {
  children: ReactNode;
  status?: Status;
  /** true لكروت القوايم الطويلة — blur أخف وميل متعطل، عشان الأداء */
  dense?: boolean;
  className?: string;
  as?: "div" | "article" | "li" | "section";
}

const MAX_TILT = 6;

/**
 * مستطيل الكارت وهو مسطّح — يعني من غير أي ميل.
 *
 * بنلغي الـtransform للحظة القياس وبنرجّعه زي ما كان في نفس اللحظة، فمفيش
 * أي رفة على الشاشة. من غير ده كل القياسات بتبقى متأثرة بالميل اللي إحنا
 * نفسنا حاطينه.
 */
function restRectOf(el: HTMLElement): DOMRect {
  const previous = el.style.transform;
  el.style.transform = "none";
  const rect = el.getBoundingClientRect();
  el.style.transform = previous;
  return rect;
}

function isInside(rect: DOMRect, x: number, y: number): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function Card({
  children,
  status = "none",
  dense = false,
  className = "",
  as: Tag = "div",
}: CardProps) {
  const ref = useRef<HTMLElement>(null);
  const frame = useRef<number | null>(null);
  /** المستطيل المسطّح، بيتقاس مرة عند الدخول ويتحدّث عند الخروج. */
  const rest = useRef<DOMRect | null>(null);
  const hovering = useRef(false);
  const returning = useRef<JSAnimation | null>(null);
  const canTilt = useTilt();
  const reduced = useReducedMotion();

  const interactive = canTilt && !dense;

  const stopReturn = useCallback(() => {
    returning.current?.pause();
    returning.current = null;
  }, []);

  const onPointerEnter = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive || e.pointerType !== "mouse") return;
      const el = ref.current;
      if (!el) return;
      hovering.current = true;
      // الرجوع لسه شغال؟ نوقفه — عنصر واحد ميتحركش بحاجتين في نفس الوقت
      stopReturn();
      rest.current = restRectOf(el);
    },
    [interactive, stopReturn],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive || e.pointerType !== "mouse") return;
      const el = ref.current;
      if (!el) return;

      if (!hovering.current) {
        hovering.current = true;
        stopReturn();
        rest.current = restRectOf(el);
      }

      // rAF عشان منحدّثش الtransform في كل event
      if (frame.current) cancelAnimationFrame(frame.current);
      const { clientX, clientY } = e;

      frame.current = requestAnimationFrame(() => {
        const r = rest.current;
        if (!r || r.width === 0 || r.height === 0) return;

        const px = (clientX - r.left) / r.width;
        const py = (clientY - r.top) / r.height;

        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
        el.style.transform =
          `perspective(900px) ` +
          `rotateX(${(0.5 - py) * MAX_TILT}deg) ` +
          `rotateY(${(px - 0.5) * MAX_TILT}deg)`;
      });
    },
    [interactive, stopReturn],
  );

  const onPointerLeave = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive || e.pointerType !== "mouse") return;
      const el = ref.current;
      if (!el) return;

      // ⚠️ خروج وهمي: الماوس مكانه، اللي اتحرك هو الكارت من تحته بسبب
      // الميل نفسه. لو تعاملنا معاه كخروج حقيقي بنبدأ حلقة رفرفة عند
      // الحافة. بنقيس المستطيل المسطّح ونشوف الماوس جواه ولا لأ.
      const r = restRectOf(el);
      rest.current = r;
      if (isInside(r, e.clientX, e.clientY)) return;

      hovering.current = false;
      if (frame.current) cancelAnimationFrame(frame.current);
      stopReturn();

      // anime.js هي اللي بتمسك الtransform من هنا لحد ما يخلص —
      // عنصر واحد = مكتبة واحدة.
      returning.current = animate(el, {
        rotateX: 0,
        rotateY: 0,
        duration: 700,
        ease: "outElastic(1, .55)",
        onComplete: () => {
          returning.current = null;
          // رجع بالماوس وهو لسه بيرجع؟ سيبله الميل الجديد بدل ما نمسحه
          if (!hovering.current) el.style.transform = "";
        },
      });
    },
    [interactive, stopReturn],
  );

  // على الموبايل: ضغطة سريعة بدل الميل
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (interactive || reduced || e.pointerType === "mouse") return;
      const el = ref.current;
      if (!el) return;
      animate(el, { scale: [1, 0.985, 1], duration: 200, ease: "outQuad" });
    },
    [interactive, reduced],
  );

  return (
    <Tag
      ref={ref as never}
      className={[
        "card",
        status !== "none" ? `card--${status}` : "",
        dense ? "card--list" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
    >
      <div className="card__inner">{children}</div>
    </Tag>
  );
}
