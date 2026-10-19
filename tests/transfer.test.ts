import { describe, expect, it } from "vitest";

import { redactVisit } from "@/lib/analytics";
import { emptyPlan, REGISTRATION_FEE_ITEM, type PlanState } from "@/lib/calc/model";
import { normalizePlan } from "@/lib/calc/plan-file";
import {
  compactPlan,
  decodePlanFragment,
  encodePlanFragment,
  expandPlan,
  FRAGMENT_KEY,
  MAX_FRAGMENT_CHARS,
  MAX_QR_CHARS,
  transferUrl,
  withoutFragmentAndQuery,
} from "@/lib/transfer/codec";

function sample(): PlanState {
  const plan = emptyPlan();
  plan.name = "تكساس - مع العيلة";
  plan.household = { adults: 2, children: 2, childAges: ["7", "3"] };
  plan.localCurrency = "SAR";
  plan.rate = "3.75";
  plan.registrations = 2;
  plan.uiMode = "detailed";
  plan.bufferMonths = "3";
  plan.items["rent"] = { raw: "١٥٠٠", currency: "usd" };
  plan.items["ticket"] = { raw: "9000", currency: "local" };
  plan.items["healthInsurance"] = { raw: "300", currency: "usd", perPerson: true };
  plan.items["passport"] = { raw: "40", currency: "usd" };
  plan.items[REGISTRATION_FEE_ITEM] = { raw: "", currency: "usd" }; // the prefill was cleared on purpose
  plan.quick["quickTravel"] = { raw: "5000", currency: "usd" };
  plan.savings = { raw: "20000", currency: "usd" };
  plan.income = { raw: "1200", currency: "local" };
  return plan;
}

async function roundTrip(plan: PlanState): Promise<PlanState> {
  const fragment = await encodePlanFragment(plan);
  expect(fragment).not.toBeNull();
  const decoded = await decodePlanFragment(`#${fragment ?? ""}`);
  if (!decoded.ok) throw new Error(`decoding failed: ${decoded.reason}`);
  return decoded.plan;
}

describe("moving a plan in a link: encode and decode", () => {
  it("brings back exactly the plan that was sent, including Arabic text and a cleared fee", async () => {
    const plan = normalizePlan(sample());
    expect(await roundTrip(plan)).toEqual(plan);
  });

  it("brings back a new empty plan, and keeps a fee the person changed", async () => {
    expect(await roundTrip(emptyPlan())).toEqual(emptyPlan());
    const changed = emptyPlan();
    changed.items[REGISTRATION_FEE_ITEM] = { raw: "2", currency: "usd" };
    expect((await roundTrip(changed)).items[REGISTRATION_FEE_ITEM]?.raw).toBe("2");
  });

  it("keeps the link short enough for a QR code, for a plan with many numbers", async () => {
    const plan = sample();
    for (const id of Object.keys(plan.items)) plan.items[id] = { raw: "123456", currency: "usd" };
    const fragment = await encodePlanFragment(plan);
    const url = transferUrl("https://dv-compass.vercel.app", "ar", fragment ?? "");
    expect(url.length).toBeLessThan(MAX_QR_CHARS);
  });

  it("sends only what differs from a new plan", () => {
    expect(Object.keys(compactPlan(emptyPlan()))).toEqual(["v"]);
    const compact = compactPlan(sample());
    expect(Object.keys(compact["items"] as object).sort()).toEqual(
      ["healthInsurance", "passport", "registrationFee", "rent", "ticket"].sort(),
    );
  });

  it("puts the plan after the '#', never in the path or the query", async () => {
    const fragment = (await encodePlanFragment(sample())) ?? "";
    expect(fragment.startsWith(`${FRAGMENT_KEY}=`)).toBe(true);
    const url = transferUrl("https://dv-compass.vercel.app", "en", fragment);
    expect(url.indexOf("#")).toBe(url.indexOf(fragment) - 1);
    expect(url.slice(0, url.indexOf("#"))).toBe("https://dv-compass.vercel.app/en/plans");
    expect(url).not.toContain("?");
  });
});

describe("opening a link that is not a good plan", () => {
  const reason = async (fragment: string) => {
    const result = await decodePlanFragment(fragment);
    return result.ok ? "ok" : result.reason;
  };

  it("says there is no plan when there is nothing after the key", async () => {
    expect(await reason("")).toBe("empty");
    expect(await reason("#")).toBe("empty");
    expect(await reason("#other=abc")).toBe("empty");
    expect(await reason("#p=")).toBe("empty");
  });

  it("refuses text that is not the link's alphabet, and text that does not unpack", async () => {
    expect(await reason("#p=not valid!!")).toBe("unreadable");
    expect(await reason("#p=AAAA")).toBe("unreadable");
  });

  it("refuses a link that is too long without trying to unpack it", async () => {
    expect(await reason(`#p=${"A".repeat(MAX_FRAGMENT_CHARS + 1)}`)).toBe("too-large");
  });

  it("refuses a small link that would unpack to a huge text (a compression bomb)", async () => {
    const bomb = new Blob(["a".repeat(2_000_000)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    const bytes = new Uint8Array(await new Response(bomb).arrayBuffer());
    expect(bytes.length).toBeLessThan(MAX_FRAGMENT_CHARS);
    const text = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await reason(`#p=${text}`)).toBe("too-large");
  });

  it("refuses a well-formed text that is not a plan of this version", async () => {
    const pack = async (value: unknown) => {
      const stream = new Blob([JSON.stringify(value)])
        .stream()
        .pipeThrough(new CompressionStream("deflate-raw"));
      const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
      return `#p=${btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")}`;
    };
    expect(await reason(await pack({ v: 99 }))).toBe("invalid");
    expect(await reason(await pack([1, 2]))).toBe("invalid");
    expect(await reason(await pack({ v: 1, rate: 5 }))).toBe("invalid");
    expect(await reason(await pack({ v: 1, household: { adults: 500, children: 0, childAges: [] } }))).toBe(
      "invalid",
    );
    expect(expandPlan({ v: 1 })).toEqual(emptyPlan());
  });
});

describe("what the visit counter may see", () => {
  it("cuts the '#' part and the query from every address it is given", () => {
    expect(withoutFragmentAndQuery("https://x.app/ar/plans#p=SECRET")).toBe("https://x.app/ar/plans");
    expect(withoutFragmentAndQuery("https://x.app/ar/plans?a=1#p=SECRET")).toBe("https://x.app/ar/plans");
    expect(withoutFragmentAndQuery("https://x.app/ar")).toBe("https://x.app/ar");
  });

  it("never lets a link that carries a plan through, whatever the event", async () => {
    const fragment = (await encodePlanFragment(sample())) ?? "";
    const url = transferUrl("https://dv-compass.vercel.app", "ar", fragment);
    for (const type of ["pageview", "event"] as const) {
      const sent = redactVisit({ type, url });
      expect(sent.url).toBe("https://dv-compass.vercel.app/ar/plans");
      expect(JSON.stringify(sent)).not.toContain(fragment.slice(2, 20));
    }
  });
});
