# محتاج تأكيد

> الملف ده **بيتولد تلقائي** بـ`npm run verify-content`. متعدلوش بإيدك.
> أي حقل هنا بيظهر في الموقع كـ"محتاج تأكيد" مش كرقم.
> **متحطش رقم من دماغك عشان تفضّي القايمة.** ناس بتاخد قرارات بفلوسها على الأرقام دي.

**آخر تحديث للملف ده:** 2026-09-16

**الحالة دلوقتي:** 4 ولاية · 12 مدينة · 2 شيك ليست — إجمالي 405 حقل.

| الحالة | العدد | معناها في الواجهة |
|---|---|---|
| `verified` | 50 | من غير بادج، المصدر في الفوتنوت |
| `estimated` | 156 | بادج "تقديري"، والbasis في tooltip |
| `judgment` | 28 | من غير بادج — بيتعرض كوصف مش كرقم |
| `NEEDS_VERIFICATION` | 171 | بادج "محتاج تأكيد"، ومفيش رقم |

---

## 🔴 أولوية أولى — من غيرهم الخطة مبتشتغلش

| الحقل | فين | تراجعه منين |
|---|---|---|
| `costs.roomRent` | كل ملفات metros/ | إعلانات فعلية للغرف المشتركة — أهم رقم في الموقع كله |
| `car.carNeed` | كل ملفات metros/ | Walk Score + موقع هيئة المواصلات. ركّز على المدن اللي بين ٣ و٤ — الفرق بينهم بيغيّر قرار شرا العربية |
| `costs.carInsurance` | كل ملفات metros/ | عروض تأمين فعلية لسايق من غير تاريخ قيادة أمريكي |
| `car.monthlyTransitPass` | metros/ (المدن carNeed ≤ 3) | موقع هيئة المواصلات في المدينة |
| `fees.*` | fees.json | travel.state.gov و uscis.gov — الصفحات الرسمية نفسها |

**ابدأ بـ٨ مدن بس** بدل الخمسين: `nyc-ny` · `jersey-city-nj` · `chicago-il` · `philadelphia-pa` · `houston-tx` · `dearborn-mi` · `charlotte-nc` · `columbus-oh`.
دول بيغطوا كل درجات سلم الحاجة للعربية من ١ لـ٥، فالخطة هتشتغل صح من أول يوم.

**وفي `carNeed` تحديدًا:** المدن اللي بين ٣ و٤ هي اللي محتاجة حسم — `baltimore-md` · `minneapolis-mn` · `portland-or` · `seattle-wa`. الفرق بين ٣ و٤ هو الفرق بين "أقدر أأجل العربية" و"محتاجها من أول شهر" — يعني آلاف الدولارات في خطة حد ميزانيته ضيقة.

---

## 🟣 ترتيب ذاتي (`judgment`) — مش محتاج مصدر، محتاج مراجعة رأي

28 حقل حالتهم `judgment`. دي أحكام شخصية مش قياسات — مفيش مصدر بيرتب المدن رقميًا عليها.

- **بتتعرض كوصف مش كرقم.** "جالية عربية كبيرة" — مش "٤ من ٥".
- الرقم داخلي للترتيب في محرك الخطة بس، ووزنه مسقوف في `lib/planner/judgment.ts`.
- لو لقيت مصدر فعلًا بيرتب واحد منهم رقميًا، حوّله `estimated` أو `verified`.

---

## ⏰ عدّى ميعاد مراجعته

مفيش حاجة متأخرة دلوقتي. ✅

---

## 📋 كل الحقول الناقصة

171 حقل، في 29 ملف.

<details><summary><code>checklists\arrival.json</code> — 5</summary>

- `items[2]`
- `items[3]`
- `items[4]`
- `items[7]`
- `items[10]`

</details>

<details><summary><code>checklists\pre-travel.json</code> — 5</summary>

- `items[2]`
- `items[3]`
- `items[6]`
- `items[7]`
- `items[13]`

</details>

<details><summary><code>documents.json</code> — 8</summary>

- `documents[0].validity`
- `documents[1].validity`
- `documents[2].validity`
- `documents[3].validity`
- `documents[4].validity`
- `documents[5].validity`
- `documents[6].validity`
- `documents[7].validity`

</details>

<details><summary><code>eligibility.json</code> — 1</summary>

- `criteria[0].spouseParentException` — الشروط الدقيقة للاستثناء عن طريق الزوج/الزوجة أو الوالدين

</details>

<details><summary><code>fees.json</code> — 4</summary>

- `fees[3].amount` — بيختلف حسب الدولة والعيادة المعتمدة، وبيزيد بالتطعيمات الناقصة. اتصل بالعيادة المعتمدة في بلدك واكتب نطاق مش رقم واحد.
- `fees[4].amount` — بيختلف حسب البلد. راجع تعليمات بلدك في قسم Reciprocity على travel.state.gov.
- `fees[5].amount` — اكتبها كنطاق حسب عدد الأوراق.
- `fees[6].amount` — بيختلف جدًا بالموسم والمدينة. الحاسبة لازم تاخده كمُدخل من المستخدم مش كرقم ثابت.

</details>

<details><summary><code>job-presets.json</code> — 28</summary>

- `presets[0].medianSalary` — الوسيط القومي — الحاسبة تعدّله بمعامل المدينة
- `presets[0].needsLicense` — محتاج ترخيص أمريكي؟ اربطه بصفحة /credentials
- `presets[1].medianSalary` — الوسيط القومي — الحاسبة تعدّله بمعامل المدينة
- `presets[1].needsLicense` — محتاج ترخيص أمريكي؟ اربطه بصفحة /credentials
- `presets[2].medianSalary` — الوسيط القومي — الحاسبة تعدّله بمعامل المدينة
- `presets[2].needsLicense` — محتاج ترخيص أمريكي؟ اربطه بصفحة /credentials
- `presets[3].medianSalary` — الوسيط القومي — الحاسبة تعدّله بمعامل المدينة
- `presets[3].needsLicense` — محتاج ترخيص أمريكي؟ اربطه بصفحة /credentials
- `presets[4].medianSalary` — الوسيط القومي — الحاسبة تعدّله بمعامل المدينة
- `presets[4].needsLicense` — محتاج ترخيص أمريكي؟ اربطه بصفحة /credentials
- `presets[5].medianSalary` — الوسيط القومي — الحاسبة تعدّله بمعامل المدينة
- `presets[5].needsLicense` — محتاج ترخيص أمريكي؟ اربطه بصفحة /credentials
- `presets[6].medianSalary` — الوسيط القومي — الحاسبة تعدّله بمعامل المدينة
- `presets[6].needsLicense` — محتاج ترخيص أمريكي؟ اربطه بصفحة /credentials
- `presets[7].medianSalary` — الوسيط القومي — الحاسبة تعدّله بمعامل المدينة
- `presets[7].needsLicense` — محتاج ترخيص أمريكي؟ اربطه بصفحة /credentials
- `presets[8].medianSalary` — الوسيط القومي — الحاسبة تعدّله بمعامل المدينة
- `presets[8].needsLicense` — محتاج ترخيص أمريكي؟ اربطه بصفحة /credentials
- `presets[9].medianSalary` — الوسيط القومي — الحاسبة تعدّله بمعامل المدينة
- `presets[9].needsLicense` — محتاج ترخيص أمريكي؟ اربطه بصفحة /credentials
- `presets[10].medianSalary` — الوسيط القومي — الحاسبة تعدّله بمعامل المدينة
- `presets[10].needsLicense` — محتاج ترخيص أمريكي؟ اربطه بصفحة /credentials
- `presets[11].medianSalary` — الوسيط القومي — الحاسبة تعدّله بمعامل المدينة
- `presets[11].needsLicense` — محتاج ترخيص أمريكي؟ اربطه بصفحة /credentials
- `presets[12].medianSalary` — الوسيط القومي — الحاسبة تعدّله بمعامل المدينة
- `presets[12].needsLicense` — محتاج ترخيص أمريكي؟ اربطه بصفحة /credentials
- `presets[13].medianSalary` — الوسيط القومي — الحاسبة تعدّله بمعامل المدينة
- `presets[13].needsLicense` — محتاج ترخيص أمريكي؟ اربطه بصفحة /credentials

</details>

<details><summary><code>jobs\amazon-flex.json</code> — 3</summary>

- `needsEnglish` — مستوى الإنجليزي المطلوب فعليًا للشغل
- `activationDays` — مدة فحص الخلفية والتفعيل
- `requiresSSN`

</details>

<details><summary><code>jobs\doordash.json</code> — 3</summary>

- `needsEnglish` — مستوى الإنجليزي المطلوب فعليًا للشغل
- `activationDays` — مدة فحص الخلفية والتفعيل
- `requiresSSN`

</details>

<details><summary><code>jobs\instacart.json</code> — 5</summary>

- `needsCar` — بعض المدن بتسمح بالعجل أو السكوتر — اتأكد للمدينة نفسها
- `minCarYear` — بيختلف من مدينة لمدينة
- `needsEnglish` — مستوى الإنجليزي المطلوب فعليًا للشغل
- `activationDays` — مدة فحص الخلفية والتفعيل
- `requiresSSN`

</details>

<details><summary><code>jobs\lyft.json</code> — 3</summary>

- `needsEnglish` — مستوى الإنجليزي المطلوب فعليًا للشغل
- `activationDays` — مدة فحص الخلفية والتفعيل
- `requiresSSN`

</details>

<details><summary><code>jobs\uber-eats.json</code> — 5</summary>

- `needsCar` — بعض المدن بتسمح بالعجل أو السكوتر — اتأكد للمدينة نفسها
- `minCarYear` — بيختلف من مدينة لمدينة
- `needsEnglish` — مستوى الإنجليزي المطلوب فعليًا للشغل
- `activationDays` — مدة فحص الخلفية والتفعيل
- `requiresSSN`

</details>

<details><summary><code>jobs\uber.json</code> — 3</summary>

- `needsEnglish` — مستوى الإنجليزي المطلوب فعليًا للشغل
- `activationDays` — مدة فحص الخلفية والتفعيل
- `requiresSSN`

</details>

<details><summary><code>jobs\walmart-spark.json</code> — 3</summary>

- `needsEnglish` — مستوى الإنجليزي المطلوب فعليًا للشغل
- `activationDays` — مدة فحص الخلفية والتفعيل
- `requiresSSN`

</details>

<details><summary><code>metros\arlington-va.json</code> — 7</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.utilities`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\austin-tx.json</code> — 7</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.utilities`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\charlotte-nc.json</code> — 7</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.utilities`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\dallas-tx.json</code> — 7</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.utilities`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\houston-tx.json</code> — 7</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.utilities`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\miami-fl.json</code> — 7</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.utilities`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\orlando-fl.json</code> — 7</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.utilities`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\raleigh-nc.json</code> — 7</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.utilities`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\richmond-va.json</code> — 7</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.utilities`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\san-antonio-tx.json</code> — 7</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.utilities`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\tampa-fl.json</code> — 7</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.utilities`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\virginia-beach-va.json</code> — 7</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.utilities`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>states\FL.json</code> — 1</summary>

- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.

</details>

<details><summary><code>states\TX.json</code> — 1</summary>

- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.

</details>

<details><summary><code>states\VA.json</code> — 1</summary>

- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.

</details>

<details><summary><code>steps.json</code> — 8</summary>

- `steps[0].durationDays`
- `steps[1].durationDays`
- `steps[3].durationDays`
- `steps[6].durationDays`
- `steps[7].durationDays`
- `steps[8].durationDays`
- `steps[9].durationDays`
- `steps[10].durationDays`

</details>

---

## 🌐 الإنجليزي الناقص

93 نص عربي جاهز والإنجليزي بتاعه لسه فاضي. اللغتين المفروض متساويتين — مفيش لغة "أصلية" ولغة "ترجمة".

| الملف | العدد |
|---|---|
| `job-presets.json` | 14 |
| `scams.json` | 20 |
| `checklists\arrival.json` | 22 |
| `checklists\pre-travel.json` | 30 |
| `jobs\amazon-flex.json` | 1 |
| `jobs\doordash.json` | 1 |
| `jobs\instacart.json` | 1 |
| `jobs\lyft.json` | 1 |
| `jobs\uber-eats.json` | 1 |
| `jobs\uber.json` | 1 |
| `jobs\walmart-spark.json` | 1 |

## ✍️ محتوى لسه ماتكتبش

7 نص فاضي في اللغتين — دي حاجات محتاجة تتكتب من الأول مش تترجم. أوضحهم `howItPays` في ملفات `jobs/`: إزاي كل تطبيق بيحسب أرباحه.

| الملف | العدد |
|---|---|
| `jobs\amazon-flex.json` | 1 |
| `jobs\doordash.json` | 1 |
| `jobs\instacart.json` | 1 |
| `jobs\lyft.json` | 1 |
| `jobs\uber-eats.json` | 1 |
| `jobs\uber.json` | 1 |
| `jobs\walmart-spark.json` | 1 |

---

## لينكات صفحة المواقع

⚠️ **36 لينك لسه ماتفتحوش ولا مرة.** اتكتبوا من معرفة عامة والشبكة على جهاز البناء بتحجب المواقع الخارجية (بترجع 403 حتى لـ`travel.state.gov`)، فماتأكدناش إنهم شغالين.

افتحهم واحد واحد، صلّح اللي اتغير، وبعدين حط تاريخ النهاردة في `linksLastChecked` في `content/resources.json`.

---

## إزاي تأكّد حقل

1. افتح المصدر الرسمي وشوف الرقم بعينك
2. غيّر `value` و `status: "verified"` و `lastVerified` لتاريخ النهاردة
3. حط اللينك المباشر في `sources`
4. `npm run verify-content` تاني

> ولو الرقم تقديري مش مؤكد: `status: "estimated"` **لازم** معاه `basis` (التقدير جه منين)
> و `verifyIn` (يتراجع كل قد إيه). من غيرهم الـbuild بيفشل.
