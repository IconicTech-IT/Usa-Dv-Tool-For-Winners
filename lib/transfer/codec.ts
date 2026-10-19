import { normalizePlan } from "@/lib/calc/plan-file";
import { defaultField, emptyPlan, PlanStateSchema, type AmountField, type PlanState } from "@/lib/calc/model";

/**
 * "Move to another device" with no server: the plan is made small, compressed and put in the
 * part of the address after the "#". A browser never sends that part to a server, so the link
 * can carry the numbers without anyone but its holder seeing them.
 *
 * Opening such a link only OFFERS to add the plan; it never replaces anything.
 */

export const TRANSFER_VERSION = 1;
/** The name of the piece after the "#" that holds the plan: `#p=...`. */
export const FRAGMENT_KEY = "p";
/** A link longer than this is refused when it is opened (a normal plan is well under a thousand). */
export const MAX_FRAGMENT_CHARS = 8_000;
/** The most text a link may unpack to. A crafted link cannot make the page unpack more than this. */
export const MAX_PLAIN_BYTES = 64_000;
/** Longer than this and the QR code would be too dense to scan; the link alone is offered. */
export const MAX_QR_CHARS = 1_600;

export type TransferFailure = "empty" | "too-large" | "unreadable" | "invalid" | "unsupported";
export type DecodeResult = { ok: true; plan: PlanState } | { ok: false; reason: TransferFailure };

export function isTransferSupported(): boolean {
  return typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
}

/* ---------- a small form of the plan: only what differs from a new plan ---------- */

function differs(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

function changedFields(
  fields: Record<string, AmountField>,
  defaultFor: (id: string) => AmountField,
): Record<string, AmountField> {
  const out: Record<string, AmountField> = {};
  for (const [id, field] of Object.entries(fields)) if (differs(field, defaultFor(id))) out[id] = field;
  return out;
}

/** The plan without everything that is the same as in a new plan. */
export function compactPlan(plan: PlanState): Record<string, unknown> {
  const base = emptyPlan();
  const out: Record<string, unknown> = { v: TRANSFER_VERSION };
  for (const key of Object.keys(base) as (keyof PlanState)[]) {
    if (key === "items" || key === "quick" || key === "aloneMonthly" || key === "version") continue;
    if (differs(plan[key], base[key])) out[key] = plan[key];
  }
  const items = changedFields(plan.items, defaultField);
  const quick = changedFields(plan.quick, () => ({ raw: "", currency: "usd" }));
  const aloneMonthly = changedFields(plan.aloneMonthly, () => ({ raw: "", currency: "usd" }));
  if (Object.keys(aloneMonthly).length > 0) out["aloneMonthly"] = aloneMonthly;
  if (Object.keys(items).length > 0) out["items"] = items;
  if (Object.keys(quick).length > 0) out["quick"] = quick;
  return out;
}

/** The boxes of a new plan with the changed ones of the link laid over them. */
function withChanged(base: Record<string, AmountField>, changed: unknown): Record<string, unknown> {
  return { ...base, ...(typeof changed === "object" && changed !== null ? changed : {}) };
}

/** Puts a compact plan back together with the defaults, then checks it with the plan schema. */
export function expandPlan(compact: unknown): PlanState | null {
  if (typeof compact !== "object" || compact === null || Array.isArray(compact)) return null;
  const data = compact as Record<string, unknown>;
  if (data["v"] !== TRANSFER_VERSION) return null;
  const base = emptyPlan();
  const { v: _version, items, quick, aloneMonthly, ...rest } = data;
  const merged = {
    ...base,
    ...rest,
    items: withChanged(base.items, items),
    quick: withChanged(base.quick, quick),
    aloneMonthly: withChanged(base.aloneMonthly, aloneMonthly),
  };
  const parsed = PlanStateSchema.safeParse(merged);
  return parsed.success ? normalizePlan(parsed.data) : null;
}

/* ---------- compression and the text form ---------- */

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  } catch {
    return null;
  }
}

async function readAll(stream: ReadableStream<Uint8Array>, maxBytes: number): Promise<Uint8Array | null> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

async function pipe(bytes: Uint8Array, transform: CompressionStream | DecompressionStream, maxBytes: number) {
  const writer = transform.writable.getWriter();
  // The writer is not awaited before reading: a stream waits for its reader before it accepts more.
  void writer
    .write(bytes as BufferSource)
    .then(() => writer.close())
    .catch(() => undefined);
  return readAll(transform.readable, maxBytes);
}

/**
 * The piece after the "#": `p=` followed by the plan. Null when this browser cannot compress, or
 * when the result is longer than a link may be (the person is then pointed to the saved file).
 */
export async function encodePlanFragment(plan: PlanState): Promise<string | null> {
  try {
    const text = JSON.stringify(compactPlan(plan));
    const packed = await pipe(
      new TextEncoder().encode(text),
      new CompressionStream("deflate-raw"),
      MAX_PLAIN_BYTES,
    );
    if (packed === null) return null;
    const fragment = `${FRAGMENT_KEY}=${toBase64Url(packed)}`;
    return fragment.length > MAX_FRAGMENT_CHARS ? null : fragment;
  } catch {
    return null;
  }
}

/** Reads a fragment such as `#p=...` or `p=...`. Never throws. */
export async function decodePlanFragment(fragment: string): Promise<DecodeResult> {
  const text = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  if (!text.startsWith(`${FRAGMENT_KEY}=`)) return { ok: false, reason: "empty" };
  const payload = text.slice(FRAGMENT_KEY.length + 1);
  if (payload.length === 0) return { ok: false, reason: "empty" };
  if (payload.length > MAX_FRAGMENT_CHARS) return { ok: false, reason: "too-large" };
  if (!isTransferSupported()) return { ok: false, reason: "unsupported" };

  const packed = fromBase64Url(payload);
  if (packed === null) return { ok: false, reason: "unreadable" };
  try {
    const plain = await pipe(packed, new DecompressionStream("deflate-raw"), MAX_PLAIN_BYTES);
    if (plain === null) return { ok: false, reason: "too-large" };
    const plan = expandPlan(JSON.parse(new TextDecoder().decode(plain)));
    return plan === null ? { ok: false, reason: "invalid" } : { ok: true, plan };
  } catch {
    return { ok: false, reason: "unreadable" };
  }
}

/** The link to open on the other device: the plans page of the same language, plan after the "#". */
export function transferUrl(origin: string, locale: string, fragment: string): string {
  return `${origin}/${locale}/plans#${fragment}`;
}

/** The address with the "#" part and the query removed: what an analytics tool may see. */
export function withoutFragmentAndQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}
