"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { Icon } from "@/components/Icon";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useIsClient } from "@/lib/use-is-client";

/** Brand, language link and light/dark switch. It stays the same on every page. */
export function SiteHeader() {
  const t = useTranslations("header");
  const locale = useLocale();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const isClient = useIsClient();

  const otherLocale = routing.locales.find((language) => language !== locale) ?? routing.defaultLocale;
  const isDark = resolvedTheme === "dark";

  return (
    <header className="top">
      <div className="in">
        <Link href="/" className="brand">
          <span className="mark">
            <Icon name="compass" />
          </span>
          {t("brand")}
        </Link>
        <div className="tools">
          <Link
            href={pathname}
            locale={otherLocale}
            hrefLang={otherLocale}
            lang={otherLocale}
            className="icbtn"
            aria-label={t("switchLanguage")}
          >
            {t("otherLanguage")}
          </Link>
          <button
            type="button"
            className="icbtn"
            aria-label={t("toggleTheme")}
            aria-pressed={isClient ? isDark : undefined}
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            <Icon name="sun" />
          </button>
        </div>
      </div>
    </header>
  );
}
