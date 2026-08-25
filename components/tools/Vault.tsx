"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Num } from "@/components/Num";
import { useUser } from "@/lib/store/user-store";

/**
 * بنك المستندات — تواريخ وأسماء بس.
 *
 * ⚠️ **مفيش رفع ملفات خالص.** كل حاجة على جهاز المستخدم في localStorage،
 * ومفيش سيرفر يستقبل أي حاجة. ده مكتوب صراحة للمستخدم في الصفحة.
 */
export function Vault() {
  const t = useTranslations("vault");
  const vault = useUser((s) => s.vault);
  const addDoc = useUser((s) => s.addDoc);

  const [docType, setDocType] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const remove = (i: number) =>
    useUser.setState((s) => ({ vault: s.vault.filter((_, idx) => idx !== i) }));

  const daysLeft = (d: string) => {
    const ms = new Date(d).getTime() - Date.now();
    return Number.isNaN(ms) ? null : Math.round(ms / 86_400_000);
  };

  return (
    <div className="space-y-6">
      <Card status="now">
        <form
          className="p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!docType || !expiresAt) return;
            addDoc({ docType, issuedAt, expiresAt });
            setDocType("");
            setIssuedAt("");
            setExpiresAt("");
          }}
        >
          <p className="text-sm text-[var(--slate)]">{t("localOnly")}</p>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder={t("docType")}
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="rounded-sm border border-[var(--glass-border)] bg-transparent px-3 py-2"
            />
            <label className="flex items-center gap-2 text-sm">
              {t("issued")}
              <input
                type="date"
                dir="ltr"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className="num rounded-sm border border-[var(--glass-border)] bg-transparent px-2 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              {t("expires")}
              <input
                type="date"
                dir="ltr"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="num rounded-sm border border-[var(--glass-border)] bg-transparent px-2 py-2"
              />
            </label>
            <button type="submit" className="rounded-sm border border-[var(--glass-border)] px-4 py-2">
              {t("add")}
            </button>
          </div>
        </form>
      </Card>

      {vault.length === 0 ? (
        <p className="text-[var(--slate)]">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {vault.map((d, i) => {
            const left = daysLeft(d.expiresAt);
            const urgent = left !== null && left < 180;
            return (
              <Card key={`${d.docType}-${i}`} as="li" dense status={urgent ? "danger" : "done"}>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                  <span className="font-medium">{d.docType}</span>
                  <span className="text-sm text-[var(--slate)]">
                    {left !== null && (
                      <>
                        <Num>{left}</Num> {t("daysLeft")}
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-sm underline underline-offset-4"
                  >
                    {t("remove")}
                  </button>
                </div>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
