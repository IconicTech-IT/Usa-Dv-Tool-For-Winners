import type { ReactNode } from "react";

/**
 * كل رقم في الموقع بيتلف في ده.
 * Latin وLTR وmono وtabular — عشان الأرقام تحس إنها داتا مستخرجة من مستند،
 * وعشان العرض ميرقصش وقت العدادات.
 */
export function Num({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span dir="ltr" className={`num ${className}`.trim()}>
      {children}
    </span>
  );
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function Money({ value }: { value: number }) {
  return <Num>{money.format(value)}</Num>;
}
