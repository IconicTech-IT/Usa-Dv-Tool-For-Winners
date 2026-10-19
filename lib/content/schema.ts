import { z } from "zod";

/**
 * Long text pages (public charge, about, privacy) are data, not code: a list of sections, each
 * a list of blocks. Text may hold **bold**; nothing else, so no markup can slip in.
 */

const Link = z.object({
  label: z.string().min(1),
  url: z.string().url().startsWith("https://"),
  /** A short remark under the link, for example "could not be opened when we checked". */
  note: z.string().optional(),
});

export const BlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("p"), text: z.string().min(1) }),
  z.object({ type: z.literal("note"), text: z.string().min(1) }),
  z.object({
    type: z.literal("list"),
    ordered: z.boolean().optional(),
    items: z.array(z.string().min(1)).min(1),
  }),
  z.object({ type: z.literal("links"), items: z.array(Link).min(1) }),
  z.object({
    type: z.literal("table"),
    head: z.array(z.string().min(1)).min(2),
    rows: z.array(z.array(z.string().min(1)).min(2)).min(1),
  }),
]);
export type Block = z.infer<typeof BlockSchema>;

export const SectionSchema = z.object({
  heading: z.string().min(1),
  blocks: z.array(BlockSchema).min(1),
});
export type Section = z.infer<typeof SectionSchema>;

export const PageContentSchema = z.object({
  sections: z.array(SectionSchema).min(1),
  /** A closing line under all the sections, for example where the sources come from. */
  footnote: z.string().optional(),
});
export type PageContent = z.infer<typeof PageContentSchema>;

/** A content file holds the same page in both languages. */
export const LocalizedPageSchema = z.object({ ar: PageContentSchema, en: PageContentSchema });
export type LocalizedPage = z.infer<typeof LocalizedPageSchema>;
