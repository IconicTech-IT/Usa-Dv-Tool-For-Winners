"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Num } from "@/components/Num";
import { Section } from "@/components/ui";

interface Flag {
  id: string;
  severity: "danger" | "warn";
}

/**
 * فاحص إعلان العربية — كله client-side، مفيش أي حاجة بتتبعت لأي حتة.
 *
 * القواعد صريحة ومكتوبة، مش نموذج بيخمّن: كلمات خطر معروفة،
 * ممشى غير منطقي للسنة، سعر أقل من السوق بفارق كبير، وصيغ النصب
 * المتكررة (البايع بره البلد، الدفع بـgift cards، شحن العربية).
 */
export function ListingCheck() {
  const t = useTranslations("listingCheck");
  const [text, setText] = useState("");

  const { flags, parsed } = useMemo(() => analyse(text), [text]);

  return (
    <div className="space-y-6">
      <Card status="now">
        <div className="p-4 space-y-3">
          <label className="block space-y-2">
            <span className="text-sm">{t("paste")}</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="w-full rounded-sm border border-[var(--glass-border)] bg-[var(--field-bg)] p-3"
            />
          </label>
          <p className="text-sm text-[var(--slate)]">{t("localOnly")}</p>
        </div>
      </Card>

      {text.trim() && (
        <>
          <Section title={t("extracted")}>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {([
                ["year", parsed.year],
                ["miles", parsed.miles],
                ["price", parsed.price],
              ] as const).map(([key, v]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <dt className="text-[var(--slate)]">{t(key)}</dt>
                  <dd>{v !== null ? <Num>{v.toLocaleString("en-US")}</Num> : "—"}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title={t("flags")}>
            {flags.length === 0 ? (
              <Card status="done">
                <p className="p-4 text-sm">{t("noFlags")}</p>
              </Card>
            ) : (
              <ul className="space-y-2">
                {flags.map((f) => (
                  <Card key={f.id} as="li" status={f.severity === "danger" ? "danger" : "now"}>
                    <p className="p-4 text-sm">{t(`rules.${f.id}`)}</p>
                  </Card>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}

      <Card>
        <div className="p-4 space-y-2 text-sm">
          <p className="font-bold">{t("inspectionTitle")}</p>
          <p>{t("inspection")}</p>
        </div>
      </Card>
    </div>
  );
}

/** قواعد صريحة — كل واحدة ليها سبب مكتوب في الترجمة. */
export function analyse(text: string): {
  flags: Flag[];
  parsed: { year: number | null; miles: number | null; price: number | null };
} {
  const lower = text.toLowerCase();
  const flags: Flag[] = [];

  const yearMatch = lower.match(/\b(19[89]\d|20[0-4]\d)\b/);
  const year = yearMatch ? Number(yearMatch[1]) : null;

  const milesMatch = lower.match(/([\d,]{3,})\s*(miles|mi\b|k\s*miles|ميل)/);
  const miles = milesMatch ? Number(milesMatch[1]!.replace(/,/g, "")) : null;

  const priceMatch = lower.match(/\$\s*([\d,]{3,})/);
  const price = priceMatch ? Number(priceMatch[1]!.replace(/,/g, "")) : null;

  const dangerWords = ["salvage", "rebuilt", "as-is", "as is", "no title", "mechanic special", "flood"];
  if (dangerWords.some((w) => lower.includes(w))) flags.push({ id: "dangerWords", severity: "danger" });

  const scamWords = ["gift card", "western union", "wire transfer", "shipping the car", "out of the country", "overseas", "escrow"];
  if (scamWords.some((w) => lower.includes(w))) flags.push({ id: "scamPattern", severity: "danger" });

  // ممشى غير منطقي: العربية الأمريكية بتمشي في المتوسط حوالي ١٢ ألف ميل في السنة
  if (year && miles) {
    const age = new Date().getFullYear() - year;
    if (age > 0) {
      const perYear = miles / age;
      if (perYear < 2000) flags.push({ id: "tooLowMiles", severity: "warn" });
      if (perYear > 25000) flags.push({ id: "tooHighMiles", severity: "warn" });
    }
  }

  if (price !== null && price < 1500) flags.push({ id: "suspiciouslyCheap", severity: "danger" });
  if (/urgent|asap|today only|بسرعة|النهاردة بس/.test(lower))
    flags.push({ id: "rushPressure", severity: "warn" });
  if (!priceMatch) flags.push({ id: "noPrice", severity: "warn" });

  return { flags, parsed: { year, miles, price } };
}
