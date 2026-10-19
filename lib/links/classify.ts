/**
 * How the link check reads an answer. "blocked" means the site answered in a way that usually
 * means it refuses robots (or was too slow): a person must open the link in a browser. "broken"
 * means the page is gone or the address does not exist: it must be fixed.
 */

export type LinkVerdict = "ok" | "blocked" | "broken";

/** Answers that mean "I do not talk to robots" or "try later", not "this page is gone". */
const BLOCKED_STATUSES: ReadonlySet<number> = new Set([400, 401, 403, 405, 406, 429, 451, 503, 999]);

export function classifyStatus(status: number): LinkVerdict {
  if (status >= 200 && status < 400) return "ok";
  return BLOCKED_STATUSES.has(status) ? "blocked" : "broken";
}

/** Failure codes that mean the address or its certificate is wrong, so the link cannot work for anyone. */
const BROKEN_CODES: ReadonlySet<string> = new Set([
  "ENOTFOUND",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "CERT_HAS_EXPIRED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
]);

/** `fetch` wraps the real reason in `error.cause.code`; a timeout or a reset reads as blocked. */
export function classifyFailure(error: unknown): LinkVerdict {
  const cause = (error as { cause?: { code?: unknown } } | null)?.cause;
  const code = typeof cause?.code === "string" ? cause.code : "";
  return BROKEN_CODES.has(code) ? "broken" : "blocked";
}
