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
 */

import { useRef, useCallback, type ReactNode } from "react";
import { animate } from "animejs";
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

export function Card({
  children,
  status = "none",
  dense = false,
  className = "",
  as: Tag = "div",
}: CardProps) {
  const ref = useRef<HTMLElement>(null);
  const frame = useRef<number | null>(null);
  const canTilt = useTilt();
  const reduced = useReducedMotion();

  const interactive = canTilt && !dense;

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive || e.pointerType !== "mouse") return;
      const el = ref.current;
      if (!el) return;

      // rAF عشان منحدّثش الtransform في كل event
      if (frame.current) cancelAnimationFrame(frame.current);
      const { clientX, clientY } = e;

      frame.current = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
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
    [interactive],
  );

  const onPointerLeave = useCallback(() => {
    if (!interactive) return;
    const el = ref.current;
    if (!el) return;
    if (frame.current) cancelAnimationFrame(frame.current);

    // anime.js هي اللي بتمسك الtransform من هنا لحد ما يخلص —
    // عنصر واحد = مكتبة واحدة.
    animate(el, {
      rotateX: 0,
      rotateY: 0,
      duration: 700,
      ease: "outElastic(1, .55)",
      onComplete: () => {
        el.style.transform = "";
      },
    });
  }, [interactive]);

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
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
    >
      <div className="card__inner">{children}</div>
    </Tag>
  );
}
