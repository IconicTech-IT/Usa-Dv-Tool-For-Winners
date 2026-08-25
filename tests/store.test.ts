import { describe, expect, it } from "vitest";
import { parsePersisted } from "@/lib/store/user-store";
import { tierFor, TIERS } from "@/lib/planner/tiers";

describe("داتا جاية من بره (ملف أو لينك مشاركة)", () => {
  it("بتقبل الشكل الصح", () => {
    const clean = parsePersisted({
      version: 1,
      profile: { money: 4000 },
      checklists: { documents: { passport: true } },
      prefs: { locale: "en", theme: "dark", reducedMotion: true },
    });
    expect(clean).not.toBeNull();
    expect(clean?.profile).toEqual({ money: 4000 });
    expect(clean?.prefs?.locale).toBe("en");
  });

  it("بترفض الشكل الغلط بدل ما تحطه في الstore", () => {
    expect(parsePersisted({ checklists: "مش object" })).toBeNull();
    expect(parsePersisted({ vault: [{ docType: 1 }] })).toBeNull();
    expect(parsePersisted("نص سايب")).toBeNull();
    expect(parsePersisted(null)).toBeNull();
  });

  it("بتشيل أي مفاتيح زيادة مش في الshape", () => {
    const clean = parsePersisted({
      profile: { money: 100 },
      // حاجة مش من عندنا — المفروض متعديش للstore
      isAdmin: true,
    });
    expect(clean).not.toBeNull();
    expect(clean && "isAdmin" in clean).toBe(false);
  });

  it("مفيش رقم حالة في أي حتة — الموقع شغال لواحد مكسبش", () => {
    const clean = parsePersisted({ journey: { dates: {} } });
    expect(JSON.stringify(clean)).not.toContain("caseNumber");
  });
});

describe("شرايح الميزانية", () => {
  it("كل قيمة runway ليها شريحة — مفيش حد يقع بره", () => {
    for (const months of [0, 0.4, 1.5, 2.9, 3, 5.9, 6, 40]) {
      expect(tierFor(months)).toBeDefined();
    }
  });

  it("runway سالب بيروح لأصعب شريحة مش لأسهل واحدة", () => {
    expect(tierFor(-3).tier).toBe("A");
  });

  it("الشرايح مغطية المدى كله من غير فجوة", () => {
    for (let i = 0; i < TIERS.length - 1; i++) {
      expect(TIERS[i]!.runway[1]).toBe(TIERS[i + 1]!.runway[0]);
    }
  });
});
