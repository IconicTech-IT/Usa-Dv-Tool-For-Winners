"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/**
 * الهيدر ثابت ومبيتحركش بين الصفحات (persistent layout) —
 * الثبات ده بيدي إحساس بتطبيق مش موقع.
 */
export function Header() {
  const t = useTranslations("header");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  const themes = ["system", "light", "dark"] as const;
  const nextTheme =
    themes[(themes.indexOf((theme ?? "system") as (typeof themes)[number]) + 1) % themes.length] ??
    "system";

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-3">
      <Link href="/" className="font-bold tracking-tight">
        {t("brand")}
      </Link>

      <nav className="flex items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => router.replace(pathname, { locale: other })}
          className="rounded-sm border border-[var(--glass-border)] px-2 py-1"
        >
          {other === "ar" ? "العربية" : "English"}
        </button>

        <button
          type="button"
          onClick={() => setTheme(nextTheme)}
          className="rounded-sm border border-[var(--glass-border)] px-2 py-1"
          aria-label={t("toggleTheme")}
        >
          {/* قبل الhydration مش عارفين الثيم — نعرض محايد عشان مفيش وميض */}
          {!mounted ? "◐" : theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "◐"}
        </button>
      </nav>
    </header>
  );
}
