import { PersistedState, type PersistedStateT } from "@/lib/store/user-store";

/**
 * مشاركة الخطة كلينك: كل مُدخلاتك بتتشفّر base64 في الـURL نفسه.
 * المستخدم يبعت اللينك لأهله أو يفتحه على جهاز تاني — من غير حساب
 * ولا سيرفر، وده بالظبط معمارية الموقع.
 *
 * ⚠️ الداتا اللي جاية من لينك **مصدر خارجي**: بتتحقق بـzod قبل ما
 * تدخل الstore. وفي الواجهة لازم يظهر تحذير جنب الزرار إن اللينك
 * فيه بياناته المالية كلها.
 */

function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodePlan(state: PersistedStateT): string {
  return toBase64(JSON.stringify(state));
}

/** بيرجع null لو اللينك مش صالح — ومبيرميش، لأن ده مُدخل من بره. */
export function decodePlan(encoded: string): PersistedStateT | null {
  try {
    const parsed = PersistedState.safeParse(JSON.parse(fromBase64(encoded)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
