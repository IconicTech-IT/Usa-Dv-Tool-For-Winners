"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Link } from "@/i18n/navigation";
import type { SearchDoc } from "@/lib/content/search-index";

export function Search({ docs }: { docs: SearchDoc[] }) {
  const t = useTranslations("search");
  const [q, setQ] = useState("");

  const fuse = useMemo(
    () => new Fuse(docs, { keys: ["title", "body"], threshold: 0.35, ignoreLocation: true }),
    [docs],
  );

  const results = q.trim() ? fuse.search(q).slice(0, 30) : [];

  return (
    <div className="space-y-5">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("placeholder")}
        aria-label={t("placeholder")}
        className="w-full rounded-sm border border-[var(--glass-border)] bg-[var(--field-bg)] px-4 py-3"
      />

      {q.trim() && results.length === 0 && <p className="text-[var(--slate)]">{t("noResults")}</p>}

      <ul className="space-y-2">
        {results.map(({ item }) => (
          <Card key={item.id} as="li" dense>
            <Link href={item.href} className="block px-4 py-3 space-y-1">
              <span className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium">{item.title}</span>
                <span className="text-xs text-[var(--slate)]">{t(`kinds.${item.kind}`)}</span>
              </span>
              <span className="block text-sm text-[var(--slate)] line-clamp-2">{item.body}</span>
            </Link>
          </Card>
        ))}
      </ul>
    </div>
  );
}
