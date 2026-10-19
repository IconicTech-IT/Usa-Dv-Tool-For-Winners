import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className="mt-16 border-t border-[var(--glass-border)] px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-3 text-sm text-[var(--slate)]">
        <p>{t("legal")}</p>
        <p>
          {t("contactBefore")}
          <a
            href={`mailto:${t("email")}`}
            className="underline underline-offset-4"
            dir="ltr"
          >
            {t("email")}
          </a>
        </p>
      </div>
    </footer>
  );
}
