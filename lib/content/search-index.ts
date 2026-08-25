import {
  loadGlossary,
  loadJobs,
  loadMetros,
  loadScams,
  loadStates,
  loadSteps,
  loadDocuments,
} from "./load";

export interface SearchDoc {
  id: string;
  title: string;
  body: string;
  href: string;
  kind: string;
}

/**
 * فهرس البحث بيتبنى وقت الـbuild وبيتبعت للمتصفح.
 * البحث نفسه بيحصل على جهاز المستخدم — مفيش سيرفر ومفيش تتبع.
 */
export function buildSearchIndex(lang: "ar" | "en"): SearchDoc[] {
  const pick = (v: { ar: string; en: string }) => (v[lang]?.trim() ? v[lang] : v.ar);
  const out: SearchDoc[] = [];

  for (const m of loadMetros()) {
    out.push({
      id: `metro-${m.slug}`,
      title: pick(m.name),
      body: pick(m.car.carNeedLabel),
      href: "/compare/cities",
      kind: "city",
    });
  }

  for (const s of loadStates()) {
    out.push({
      id: `state-${s.code}`,
      title: pick(s.name),
      body: s.code,
      href: "/compare/states",
      kind: "state",
    });
  }

  for (const term of loadGlossary()) {
    out.push({
      id: `term-${term.term}`,
      title: term.term,
      body: `${lang === "ar" ? term.ar : term.en || term.ar} ${pick(term.whyItMatters)}`,
      href: "/glossary",
      kind: "term",
    });
  }

  for (const j of loadJobs()) {
    out.push({
      id: `job-${j.slug}`,
      title: j.name,
      body: pick(j.summary),
      href: `/jobs/${j.slug}`,
      kind: "job",
    });
  }

  for (const s of loadScams()) {
    out.push({
      id: `scam-${s.id}`,
      title: pick(s.title),
      body: `${pick(s.how)} ${pick(s.truth)}`,
      href: "/scams",
      kind: "scam",
    });
  }

  for (const s of loadSteps()) {
    out.push({
      id: `step-${s.id}`,
      title: pick(s.name),
      body: pick(s.what),
      href: "/timeline",
      kind: "step",
    });
  }

  for (const d of loadDocuments()) {
    out.push({
      id: `doc-${d.id}`,
      title: pick(d.name),
      body: `${pick(d.why)} ${pick(d.watchOut)}`,
      href: "/checklist/documents",
      kind: "document",
    });
  }

  return out;
}
