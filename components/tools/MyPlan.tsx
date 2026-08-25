"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Num, Money } from "@/components/Num";
import { Section } from "@/components/ui";
import { useUser, parsePersisted } from "@/lib/store/user-store";
import { encodePlan, decodePlan } from "@/lib/share";

/** كل تقدم المستخدم في مكان واحد + تصدير/استيراد + مشاركة كلينك. */
export function MyPlan() {
  const t = useTranslations("myPlan");
  const state = useUser();
  const [shareUrl, setShareUrl] = useState("");
  const [imported, setImported] = useState<"ok" | "bad" | null>(null);
  const [loadedFromLink, setLoadedFromLink] = useState(false);

  // لينك مشاركة؟ الداتا بتتحقق بـzod قبل ما تدخل الstore
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash.startsWith("plan=")) return;
    const decoded = decodePlan(hash.slice(5));
    if (!decoded) return;
    const clean = parsePersisted(decoded);
    if (clean) {
      useUser.setState(clean);
      setLoadedFromLink(true);
    }
  }, []);

  const checkedCount = Object.values(state.checklists).reduce(
    (t, list) => t + Object.values(list).filter(Boolean).length,
    0,
  );

  const makeLink = () => {
    const payload = JSON.parse(state.exportJSON());
    setShareUrl(`${window.location.origin}${window.location.pathname}#plan=${encodePlan(payload)}`);
  };

  const download = () => {
    const blob = new Blob([state.exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dv-compass-plan.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {loadedFromLink && (
        <Card status="now">
          <p className="p-4 text-sm">{t("loadedFromLink")}</p>
        </Card>
      )}

      <Section title={t("summary")}>
        <ul className="space-y-2">
          <SummaryRow label={t("money")}>
            {state.profile.money ? <Money value={state.profile.money} /> : "—"}
          </SummaryRow>
          <SummaryRow label={t("runway")}>
            {state.plan ? (
              <>
                <Num>{state.plan.runwayMonths.toFixed(1)}</Num> {t("months")}
              </>
            ) : (
              "—"
            )}
          </SummaryRow>
          <SummaryRow label={t("checked")}>
            <Num>{checkedCount}</Num>
          </SummaryRow>
          <SummaryRow label={t("documents")}>
            <Num>{state.vault.length}</Num>
          </SummaryRow>
        </ul>
      </Section>

      <Section title={t("backup")}>
        <p className="text-sm text-[var(--slate)]">{t("backupHint")}</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={download} className="rounded-sm border border-[var(--glass-border)] px-4 py-2">
            {t("export")}
          </button>
          <label className="rounded-sm border border-[var(--glass-border)] px-4 py-2 cursor-pointer">
            {t("import")}
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImported(state.importJSON(await file.text()) ? "ok" : "bad");
              }}
            />
          </label>
          <button onClick={() => window.print()} className="rounded-sm border border-[var(--glass-border)] px-4 py-2">
            {t("print")}
          </button>
        </div>
        {imported === "ok" && <p className="text-sm text-[var(--seal)]">{t("importOk")}</p>}
        {imported === "bad" && <p className="text-sm text-[var(--alert)]">{t("importBad")}</p>}
      </Section>

      <Section title={t("share")}>
        <Card status="danger">
          <p className="p-4 text-sm">{t("shareWarning")}</p>
        </Card>
        <button onClick={makeLink} className="rounded-sm border border-[var(--glass-border)] px-4 py-2">
          {t("makeLink")}
        </button>
        {shareUrl && (
          <textarea
            readOnly
            value={shareUrl}
            rows={3}
            dir="ltr"
            className="w-full rounded-sm border border-[var(--glass-border)] bg-transparent p-3 text-xs num"
          />
        )}
      </Section>

      <Section title={t("dangerZone")}>
        <button
          onClick={() => {
            if (confirm(t("clearConfirm"))) state.clearAll();
          }}
          className="rounded-sm border border-[var(--alert)] text-[var(--alert)] px-4 py-2"
        >
          {t("clearAll")}
        </button>
      </Section>
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card as="li" dense>
      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        <span>{label}</span>
        <span>{children}</span>
      </div>
    </Card>
  );
}
