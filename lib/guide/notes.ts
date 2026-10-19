import { z } from "zod";

import raw from "@/content/item-notes.json";
import type { Locale } from "@/i18n/routing";

/**
 * Official rules and tips shown on the guide pages. A rule always names its official source;
 * a tip is advice, shown highlighted. The text is checked against the schema when the site is built.
 */

const Localized = z.object({ ar: z.string().min(1), en: z.string().min(1) });
const Source = Localized.extend({ url: z.string().url().startsWith("https://") });

const Note = Localized.extend({
  kind: z.enum(["rule", "tip"]),
  source: z.string().min(1),
});

const NotesSchema = z.object({
  _note: z.string(),
  sources: z.record(z.string(), Source),
  notes: z.record(z.string(), Note),
  byItem: z.record(z.string(), z.array(z.string())),
});

const data = NotesSchema.parse(raw);

export interface ItemNote {
  id: string;
  kind: "rule" | "tip";
  text: string;
  source: { label: string; url: string };
}

/** One note in one language, or null when the id is unknown. */
export function noteById(id: string, locale: Locale): ItemNote | null {
  const note = data.notes[id];
  const source = note ? data.sources[note.source] : undefined;
  if (!note || !source) return null;
  return { id, kind: note.kind, text: note[locale], source: { label: source[locale], url: source.url } };
}

/** The notes of one cost item, in the order they are shown; empty when the item has none. */
export function notesForItem(itemId: string, locale: Locale): ItemNote[] {
  const ids = data.byItem[itemId] ?? [];
  return ids.flatMap((id) => {
    const note = noteById(id, locale);
    return note ? [note] : [];
  });
}

/** Every note, source and item link, for the tests. */
export const NOTE_INDEX = { notes: Object.keys(data.notes), byItem: data.byItem, sources: data.sources };
