"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { FieldValue, localized } from "@/components/FieldValue";
import { useUser } from "@/lib/store/user-store";
import type { Field, Localized } from "@/lib/types";

export interface DocView {
  id: string;
  name: Localized;
  why: Localized;
  watchOut: Localized;
  appliesTo: string;
  needsTranslation: boolean;
  validity: Field<number>;
}

/**
 * شيك ليست الأوراق — بتترشح حسب وضع المستخدم.
 * الفلاتر بتتملي لوحدها من بياناته في الstore، وبيقدر يغيّرها.
 */
export function DocumentChecks({ docs }: { docs: DocView[] }) {
  const t = useTranslations("documents");
  const locale = useLocale() as "ar" | "en";
  const profile = useUser((s) => s.profile);
  const checks = useUser((s) => s.checklists["documents"] ?? {});
  const toggle = useUser((s) => s.toggleCheck);

  const [married, setMarried] = useState(profile.travellingAlone === false);
  const [hasKids, setHasKids] = useState((profile.kidsAges?.length ?? 0) > 0);

  const visible = docs.filter((d) => {
    if (d.appliesTo === "spouse") return married;
    if (d.appliesTo === "children") return hasKids;
    return true;
  });

  const prefilled = profile.travellingAlone !== undefined;

  return (
    <div className="space-y-5">
      <Card status="now">
        <div className="p-4 space-y-3">
          {prefilled && (
            <p className="text-sm text-[var(--slate)]">{t("prefilled")}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={married} onChange={(e) => setMarried(e.target.checked)} />
              {t("filterMarried")}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={hasKids} onChange={(e) => setHasKids(e.target.checked)} />
              {t("filterKids")}
            </label>
          </div>
        </div>
      </Card>

      <ul className="space-y-3">
        {visible.map((d) => (
          <Card key={d.id} as="li" status={checks[d.id] ? "done" : "later"}>
            <div className="p-4 space-y-2">
              <label className="flex items-center gap-3 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(checks[d.id])}
                  onChange={() => toggle("documents", d.id)}
                />
                {localized(d.name, locale)}
              </label>

              <p className="text-sm">{localized(d.why, locale)}</p>
              <p className="text-sm text-[var(--signal)]">{localized(d.watchOut, locale)}</p>

              <div className="flex flex-wrap gap-4 pt-1 text-sm text-[var(--slate)]">
                <span>
                  {t("validity")} <FieldValue field={d.validity} />
                </span>
                {d.needsTranslation && <span>{t("needsTranslation")}</span>}
              </div>
            </div>
          </Card>
        ))}
      </ul>
    </div>
  );
}
