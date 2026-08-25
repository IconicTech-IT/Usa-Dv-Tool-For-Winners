import type { Field, Localized, Source } from "@/lib/types";

/**
 * الطريقة الوحيدة اللي أي حقل بيتعرض بيها في الواجهة.
 *
 * ⚠️ حقل `judgment` بيرجع دايمًا `kind: "text"` — القيمة الرقمية بتاعته
 * مبتخرجش من هنا خالص. لو عايز الرقم للترتيب في المحرك، استخدم
 * `rankValue()` تحت، والاسم نفسه بيقول إنه للترتيب مش للعرض.
 */
export type FieldDisplay =
  | {
      kind: "number";
      value: number;
      unit?: string;
      range?: [number, number];
      badge: null | "estimated";
      basis?: Localized;
      sources: Source[];
      lastVerified: string;
    }
  | {
      kind: "text";
      text: string | Localized;
      badge: null | "estimated";
      basis?: Localized;
      sources: Source[];
      lastVerified: string;
    }
  | { kind: "missing"; badge: "needs-verification"; note?: string };

export function display(f: Field<number | string | boolean>): FieldDisplay {
  if (f.status === "NEEDS_VERIFICATION" || f.value === null) {
    return { kind: "missing", badge: "needs-verification", note: f.note };
  }

  const common = {
    badge: (f.status === "estimated" ? "estimated" : null) as null | "estimated",
    basis: f.basis,
    sources: f.sources,
    lastVerified: f.lastVerified,
  };

  // حكم شخصي — بيتعرض كوصف، والرقم بيفضل جوه.
  if (f.status === "judgment") {
    return {
      kind: "text",
      text: f.label ?? String(f.value),
      ...common,
      badge: null,
    };
  }

  if (typeof f.value === "number") {
    return { kind: "number", value: f.value, unit: f.unit, range: f.range, ...common };
  }

  return { kind: "text", text: String(f.value), ...common };
}

/**
 * الرقم الداخلي للترتيب. للمحرك بس — متعرضهوش للمستخدم.
 * بيرجع null لو الحقل مالوش قيمة، فالمحرك يتعامل مع الغياب صراحةً.
 */
export function rankValue(f: Field<number>): number | null {
  return typeof f.value === "number" ? f.value : null;
}

export function isJudgment(f: Field<unknown>): boolean {
  return f.status === "judgment";
}
