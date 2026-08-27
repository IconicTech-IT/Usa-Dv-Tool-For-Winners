import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic, IBM_Plex_Mono } from "next/font/google";

import { routing, DIRECTION, type Locale } from "@/i18n/routing";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import { PlanBar } from "@/components/PlanBar";
import { AppBackground } from "@/components/AppBackground";
import { Footer } from "@/components/Footer";
import { ServiceWorker } from "@/components/ServiceWorker";
import { Analytics } from "@vercel/analytics/next";
import "@/styles/globals.css";

/**
 * ⚠️ الخطوط من Google Fonts بقرار من صاحب الموقع.
 * البريف (قسم ٢-ب) كان طالب خطوط محلية عشان الموقع يشتغل offline بالكامل
 * ومن غير أي خدمة خارجية. `next/font/google` بينزّل الملفات وقت الـbuild
 * ويقدّمها من نفس الدومين، فمفيش طلب وقت التشغيل لجوجل ومفيش تتبع —
 * بس الملفات نفسها بتيجي من عندهم وقت البناء.
 */
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("title"),
    description: t("description"),
    manifest: "/manifest.json",
  };
}

export function generateViewport(): Viewport {
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#F4F6F5" },
      { media: "(prefers-color-scheme: dark)", color: "#0C1620" },
    ],
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const dir = DIRECTION[locale as Locale];

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexArabic.variable} ${plexMono.variable}`}
    >
      <body>
        <ThemeProvider>
          <NextIntlClientProvider>
            <AppBackground />
            <Header />
            <PlanBar />
            <main className="measure mx-auto px-4 py-10">{children}</main>
            <Footer />
            <ServiceWorker />
            {/**
             * تحليلات Vercel — بقرار من صاحب الموقع.
             *
             * الغرض منها سؤال واحد: فيه حد بيدخل الموقع ولا لأ؟ يعني عدّاد
             * زيارات، مش تتبع أفراد. Vercel Web Analytics بتعمل ده من غير
             * كوكيز، ومن غير معرّف ثابت للزائر، ومن غير تتبع بينها وبين أي
             * موقع تاني — الـIP بيتعمله hash ومبيتخزنش.
             *
             * ⚠️ برضه دي **أول حاجة في الموقع بتبعت أي حاجة لبرّه جهاز
             * المستخدم**. ونصوص زي "مفيش أي بيانات بتتجمع" في صفحة "عن
             * الموقع" والفوتر اتسابت زي ما هي بقرار من صاحب الموقع. لو حد
             * جه يعدّل النصوص دي بعدين، ياخد باله إن العدّاد ده شغال.
             *
             * مجانية على خطة Hobby في حدود الاستخدام، وفوق كده بتقف العد
             * ومفيش فاتورة — فشرط "تكلفة التشغيل صفر" لسه قايم.
             *
             * ⚠️ الحزمة لوحدها مش كفاية: لازم تتفعّل كمان من تبويب Analytics
             * في إعدادات المشروع على Vercel.
             */}
            <Analytics />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
