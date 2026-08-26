"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { z } from "zod";
import type { PlannerInput, PlanResult } from "@/lib/types";
import type { CostKey, CostOverrides, Override } from "@/lib/planner/overrides";
import { scopeFor } from "@/lib/planner/overrides";

/**
 * مصدر واحد للحقيقة لكل بيانات المستخدم.
 * القاعدة: المستخدم مايكتبش نفس المعلومة مرتين في الموقع كله.
 * أي أداة بتقرا من هنا وبتملّي حقولها لوحدها، وبتقول للمستخدم
 * "ملّينالك ده من بياناتك — تقدر تغيّره".
 *
 * كل حاجة على جهاز المستخدم. مفيش سيرفر، مفيش حساب.
 */

export const STORE_VERSION = 1;

interface UserState {
  version: number;
  profile: Partial<PlannerInput>;
  plan: PlanResult | null;
  checklists: Record<string, Record<string, boolean>>;
  vault: { docType: string; issuedAt: string; expiresAt: string }[];
  // ⚠️ مفيش رقم حالة. الموقع شغال بالكامل لواحد مكسبش.
  // كله اختياري — بيتملى بس لو المستخدم فعّل متابعة الإجراءات بنفسه.
  journey: { stage?: string; targetDate?: string; dates: Record<string, string> };
  /**
   * أرقام المستخدم نفسه لبنود التكلفة.
   * ⚠️ دي **أصدق** من أرقام الموقع لخطته هو — لو لقى غرفة بـ$650،
   * ده الرقم الصح، مش متوسطنا. وممنوع أي تحديث للموقع يمسحها.
   */
  overrides: CostOverrides;
  prefs: { locale: "ar" | "en"; theme: "system" | "light" | "dark"; reducedMotion: boolean };

  setProfile: (p: Partial<PlannerInput>) => void;
  setPlan: (p: PlanResult) => void;
  toggleCheck: (list: string, id: string) => void;
  addDoc: (d: { docType: string; issuedAt: string; expiresAt: string }) => void;
  setPref: <K extends keyof UserState["prefs"]>(k: K, v: UserState["prefs"][K]) => void;
  setOverride: (metroSlug: string, key: CostKey, value: Override | null) => void;
  clearOverrides: (metroSlug?: string) => void;
  exportJSON: () => string;
  importJSON: (raw: string) => boolean;
  clearAll: () => void;
}

/**
 * ⚠️ الداتا دي ممكن تيجي من بره — من ملف صدّره المستخدم، أو من لينك
 * "شارك خطتك" اللي بيشفّر المُدخلات في الـURL. فبتتعامل معاها كمُدخل
 * خارجي: تتحقق بـzod الأول، وأي حاجة مش متوقعة تتشال.
 */
export const PersistedState = z.object({
  version: z.number().optional(),
  profile: z.record(z.string(), z.unknown()).optional(),
  plan: z.unknown().optional(),
  checklists: z.record(z.string(), z.record(z.string(), z.boolean())).optional(),
  vault: z
    .array(
      z.object({
        docType: z.string(),
        issuedAt: z.string(),
        expiresAt: z.string(),
      }),
    )
    .optional(),
  overrides: z
    .record(
      z.string(),
      z.record(
        z.string(),
        z.union([
          z.object({ mode: z.literal("custom"), value: z.number().finite() }),
          z.object({ mode: z.literal("skip") }),
        ]),
      ),
    )
    .optional(),
  journey: z
    .object({
      stage: z.string().optional(),
      targetDate: z.string().optional(),
      dates: z.record(z.string(), z.string()).default({}),
    })
    .optional(),
  prefs: z
    .object({
      locale: z.enum(["ar", "en"]),
      theme: z.enum(["system", "light", "dark"]),
      reducedMotion: z.boolean(),
    })
    .partial()
    .optional(),
});

export type PersistedStateT = z.infer<typeof PersistedState>;

const EMPTY = {
  version: STORE_VERSION,
  profile: {},
  plan: null,
  checklists: {},
  vault: [],
  journey: { dates: {} },
  overrides: {} as CostOverrides,
  prefs: { locale: "ar" as const, theme: "system" as const, reducedMotion: false },
};

/** بيرجع state نضيف من أي داتا خارجية، أو null لو الداتا مش صالحة. */
export function parsePersisted(raw: unknown): Partial<UserState> | null {
  const parsed = PersistedState.safeParse(raw);
  if (!parsed.success) return null;

  const d = parsed.data;
  return {
    ...EMPTY,
    ...(d.profile ? { profile: d.profile as Partial<PlannerInput> } : {}),
    ...(d.checklists ? { checklists: d.checklists } : {}),
    ...(d.vault ? { vault: d.vault } : {}),
    ...(d.journey ? { journey: d.journey } : {}),
    ...(d.overrides ? { overrides: d.overrides as CostOverrides } : {}),
    ...(d.prefs ? { prefs: { ...EMPTY.prefs, ...d.prefs } } : {}),
    version: STORE_VERSION,
  };
}

export const useUser = create<UserState>()(
  persist(
    (set, get) => ({
      ...EMPTY,

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setPlan: (plan) => set({ plan }),

      toggleCheck: (list, id) =>
        set((s) => ({
          checklists: {
            ...s.checklists,
            [list]: { ...s.checklists[list], [id]: !s.checklists[list]?.[id] },
          },
        })),

      addDoc: (d) => set((s) => ({ vault: [...s.vault, d] })),

      setOverride: (metroSlug, key, value) =>
        set((s) => {
          const scope = scopeFor(key, metroSlug);
          const forScope = { ...(s.overrides[scope] ?? {}) };
          if (value === null) delete forScope[key];
          else forScope[key] = value;

          const next = { ...s.overrides, [scope]: forScope };
          if (Object.keys(forScope).length === 0) delete next[scope];
          return { overrides: next };
        }),

      clearOverrides: (metroSlug) =>
        set((s) => {
          if (!metroSlug) return { overrides: {} };
          const next = { ...s.overrides };
          delete next[metroSlug];
          return { overrides: next };
        }),
      setPref: (k, v) => set((s) => ({ prefs: { ...s.prefs, [k]: v } })),

      // التصدير ده هو النسخة الاحتياطية الوحيدة للمستخدم — قوله كده بوضوح في /my-plan
      exportJSON: () => {
        const { profile, plan, checklists, vault, journey, overrides, prefs, version } =
          get();
        return JSON.stringify(
          { version, profile, plan, checklists, vault, journey, overrides, prefs },
          null,
          2,
        );
      },

      importJSON: (raw) => {
        let data: unknown;
        try {
          data = JSON.parse(raw);
        } catch {
          return false;
        }
        const clean = parsePersisted(data);
        if (!clean) return false;
        set(clean);
        return true;
      },

      clearAll: () => set(EMPTY),
    }),
    {
      name: "dv-compass",
      storage: createJSONStorage(() => localStorage),
      version: STORE_VERSION,
      partialize: (s) => ({
        version: s.version,
        profile: s.profile,
        plan: s.plan,
        checklists: s.checklists,
        vault: s.vault,
        journey: s.journey,
        overrides: s.overrides,
        prefs: s.prefs,
      }),
      // لما تغيّر شكل الداتا، زوّد STORE_VERSION وضيف الtransform هنا
      migrate: (state) => (parsePersisted(state) ?? EMPTY) as UserState,
    },
  ),
);
