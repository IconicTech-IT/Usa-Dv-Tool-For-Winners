# الخطوط

الموقع بيستخدم **IBM Plex Sans Arabic** و **IBM Plex Sans** و **IBM Plex Mono**، ولازم تكون
**محليًا هنا** — مش من خدمة خارجية. السبب في `BRIEF.md` قسم ٢-ب: أسرع، وبيشتغل offline،
ومفيش خدمة خارجية ليها فاتورة أو حد مجاني.

**لسه مش متحطين.** لحد ما يتحطوا، `styles/tokens.css` بيقع على خط النظام
(`system-ui` / `ui-monospace`) — الموقع شغال وشكله معقول، بس مش الشكل النهائي.

## اللي مطلوب

1. نزّل الأوزان دي بصيغة `woff2` (الرخصة SIL Open Font License):
   - `IBMPlexSansArabic-Regular.woff2` · `IBMPlexSansArabic-Bold.woff2`
   - `IBMPlexSans-Regular.woff2` · `IBMPlexSans-Bold.woff2`
   - `IBMPlexMono-Regular.woff2` · `IBMPlexMono-Medium.woff2`
2. حطهم في الفولدر ده.
3. عرّفهم بـ`next/font/local` في `app/[locale]/layout.tsx` وربط المتغيرات
   `--font-sans-ar` و `--font-sans-en` و `--font-mono` بيهم.

الأرقام كلها لازم تفضل على `--font-mono` — دي الحركة التايبوغرافية المميزة في الموقع.
