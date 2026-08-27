import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const GROUPS = [
  { id: "plan", links: ["/planner", "/timeline", "/my-plan", "/compare/cities", "/compare/states"] },
  { id: "calculators", links: ["/calculators/arrival", "/calculators/runway", "/calculators/take-home", "/calculators/gig", "/calculators/car"] },
  { id: "prepare", links: ["/eligibility", "/checklist/documents", "/checklist/steps", "/interview", "/vault"] },
  { id: "arrive", links: ["/first-30-days", "/housing", "/resources", "/credit", "/health", "/taxes", "/family"] },
  { id: "work", links: ["/jobs", "/car", "/car/listing-check", "/credentials", "/green-card"] },
  { id: "site", links: ["/scams", "/glossary", "/search", "/sources", "/about"] },
];

export async function Footer() {
  const t = await getTranslations("nav");

  return (
    <footer className="mt-16 border-t border-[var(--glass-border)] px-4 py-8">
      <nav className="mx-auto max-w-5xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 text-sm">
        {GROUPS.map((g) => (
          <div key={g.id} className="space-y-2">
            <h2 className="font-bold">{t(`groups.${g.id}`)}</h2>
            <ul className="space-y-1.5">
              {g.links.map((href) => (
                <li key={href}>
                  <Link href={href} className="text-[var(--slate)] hover:underline underline-offset-4">
                    {t(`links.${href}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <p className="mx-auto max-w-5xl pt-8 text-sm text-[var(--slate)]">{t("footerNote")}</p>
    </footer>
  );
}
