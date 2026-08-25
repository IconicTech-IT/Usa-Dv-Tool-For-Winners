"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Num } from "@/components/Num";
import { localized } from "@/components/FieldValue";
import type { Localized } from "@/lib/types";

export interface SimQuestion {
  q: Localized;
  why: Localized;
  prepare: Localized;
}

/**
 * محاكي المقابلة.
 *
 * ⚠️ الأداة **مش بتقولك تقول إيه.** بتديك سؤال ووقت محدد، وبتقيس
 * الوضوح والطول، وبتفكّرك بالورقة المطلوبة. الهدف إنك تتدرب تقول
 * الحقيقة بثقة — مش تحضّر إجابة متزوّقة.
 *
 * التسجيل بيحصل في المتصفح بالكامل (Web Speech API) ومبيتبعتش لأي حتة.
 */
export function Simulator({ questions }: { questions: SimQuestion[] }) {
  const t = useTranslations("simulator");
  const locale = useLocale() as "ar" | "en";

  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const recognition = useRef<any>(null);

  const LIMIT = 45;
  const current = questions[index];

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const r = new SR();
    r.lang = locale === "ar" ? "ar-EG" : "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
    };
    recognition.current = r;
    return () => r.stop?.();
  }, [locale]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const start = () => {
    setTranscript("");
    setSeconds(0);
    setRunning(true);
    recognition.current?.start?.();
  };

  const stop = () => {
    setRunning(false);
    recognition.current?.stop?.();
  };

  const next = () => {
    stop();
    setIndex((i) => (i + 1) % questions.length);
    setSeconds(0);
    setTranscript("");
  };

  if (!current) return null;

  const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6">
      <Card status="danger">
        <div className="p-4 text-sm">
          <p className="font-bold">{t("honestyTitle")}</p>
          <p>{t("honesty")}</p>
        </div>
      </Card>

      <Card status="now">
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold">{localized(current.q, locale)}</h2>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={running ? stop : start}
              className="rounded-sm border border-[var(--glass-border)] px-4 py-2"
            >
              {running ? t("stop") : t("start")}
            </button>
            <span className="text-sm text-[var(--slate)]">
              <Num>
                {seconds}/{LIMIT}
              </Num>{" "}
              {t("seconds")}
            </span>
            <button type="button" onClick={next} className="text-sm underline underline-offset-4">
              {t("nextQuestion")}
            </button>
          </div>

          {!supported && <p className="text-sm text-warn">{t("noSpeech")}</p>}

          {transcript && (
            <div className="space-y-2">
              <p className="text-sm text-[var(--slate)]">{t("whatYouSaid")}</p>
              <p className="rounded-sm border border-[var(--glass-border)] p-3 text-sm">
                {transcript}
              </p>
            </div>
          )}
        </div>
      </Card>

      {!running && seconds > 0 && (
        <Card status="done">
          <div className="p-5 space-y-2 text-sm">
            <p className="font-bold">{t("feedback")}</p>
            <ul className="space-y-1.5 ps-5 list-disc">
              <li>
                {t("length")}{" "}
                <Num>{seconds}</Num> {t("seconds")} ·{" "}
                {seconds > LIMIT ? t("tooLong") : seconds < 8 ? t("tooShort") : t("goodLength")}
              </li>
              <li>
                {t("words")} <Num>{words}</Num>
              </li>
              <li>{localized(current.prepare, locale)}</li>
            </ul>
            <p className="text-[var(--slate)]">{t("selfCheck")}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
