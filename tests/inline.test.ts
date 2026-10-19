import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Inline } from "@/components/content/Inline";

const html = (text: string) => renderToStaticMarkup(createElement(Inline, { text }));

describe("Inline text", () => {
  it("keeps a Latin run in its own direction inside Arabic text", () => {
    expect(html("نص القانون: 8 U.S.C. 1182(a)(4)")).toBe(
      'نص القانون: <bdi dir="ltr">8 U.S.C. 1182(a)(4)</bdi>',
    );
  });

  it("isolates each run and the numbers beside Arabic words", () => {
    expect(html("المادة 212(a)(4) من القانون")).toBe('المادة <bdi dir="ltr">212(a)(4)</bdi> من القانون');
    expect(html("I-864, I-134 و I-944")).toBe(
      '<bdi dir="ltr">I-864, I-134</bdi> و <bdi dir="ltr">I-944</bdi>',
    );
  });

  it("keeps a bracketed Latin run together with its brackets", () => {
    expect(html("المصدر: تعليمات الـDV الرسمية (Federal Register)")).toBe(
      'المصدر: تعليمات الـ<bdi dir="ltr">DV</bdi> الرسمية <bdi dir="ltr">(Federal Register)</bdi>',
    );
    expect(html("حجم 600 × 600 بكسل")).toBe('حجم <bdi dir="ltr">600 × 600</bdi> بكسل');
  });

  it("makes **bold** parts strong and still isolates the Latin inside them", () => {
    expect(html("**Public Charge** معناها")).toBe(
      '<strong><bdi dir="ltr">Public Charge</bdi></strong> معناها',
    );
  });

  it("never turns text into markup", () => {
    expect(html("<script>alert(1)</script>")).not.toContain("<script>");
  });
});
