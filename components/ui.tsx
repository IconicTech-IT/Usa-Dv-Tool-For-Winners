import type { ReactNode } from "react";
import { Card } from "./Card";
import { Num } from "./Num";

export function PageHeader({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <header className="space-y-3 mb-8">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {lead && <p className="text-lg leading-relaxed text-[var(--slate)]">{lead}</p>}
      {children}
    </header>
  );
}

export function Section({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-4 ${className}`}>
      {title && <h2 className="text-xl font-bold tracking-tight">{title}</h2>}
      {children}
    </section>
  );
}

/** الرقم الكبير اللي الصفحة كلها بتشرحه. واحد بس في كل صفحة. */
export function HeroStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card status="now">
      <div className="p-6 space-y-1">
        <div className="text-sm text-[var(--slate)]">{label}</div>
        <div className="text-4xl font-bold">
          <Num>{value}</Num>
        </div>
        {hint && <div className="text-sm text-[var(--slate)]">{hint}</div>}
      </div>
    </Card>
  );
}

export function Row({
  label,
  children,
  status = "later",
}: {
  label: ReactNode;
  children: ReactNode;
  status?: "done" | "now" | "later" | "danger";
}) {
  return (
    <Card as="li" dense status={status}>
      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        <span>{label}</span>
        <span>{children}</span>
      </div>
    </Card>
  );
}

/**
 * التنبيه القانوني في فوتر صفحات الأدوات. مرة واحدة في الصفحة،
 * من غير تكرار مزعج.
 */
export function ToolDisclaimer({ text }: { text: string }) {
  return (
    <p className="mt-12 pt-4 border-t border-[var(--glass-border)] text-sm text-[var(--slate)]">
      {text}
    </p>
  );
}

export function LastUpdated({ date, label }: { date: string; label: string }) {
  return (
    <p className="text-sm text-[var(--slate)]">
      {label} <Num>{date}</Num>
    </p>
  );
}

/**
 * الحاجة للعربية — مش رقم من ٥.
 * شريط بخمس درجات متدرج من seal (مش محتاج) لـalert (إجباري)،
 * وتحته الجملة بالعامية مباشرة.
 */
export function CarNeedBar({
  level,
  label,
  unknownLabel,
}: {
  level: number | null;
  label: string;
  unknownLabel: string;
}) {
  const colors = [
    "var(--seal)",
    "color-mix(in srgb, var(--seal) 55%, var(--signal))",
    "var(--signal)",
    "color-mix(in srgb, var(--signal) 45%, var(--alert))",
    "var(--alert)",
  ];

  if (level === null) {
    return <span className="badge badge--needs-verification">{unknownLabel}</span>;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1" role="img" aria-label={label}>
        {[1, 2, 3, 4, 5].map((step) => (
          <span
            key={step}
            className="h-2 flex-1 rounded-full"
            style={{
              background:
                step <= level
                  ? colors[level - 1]
                  : "color-mix(in srgb, var(--slate) 22%, transparent)",
            }}
          />
        ))}
      </div>
      <div className="text-sm">{label}</div>
    </div>
  );
}

/** قايمة نقاط بسيطة بمسافات مريحة. */
export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2 ps-5 list-disc marker:text-[var(--slate)]">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
