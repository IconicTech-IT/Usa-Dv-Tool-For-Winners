# محتاج تأكيد

> الملف ده **بيتولد تلقائي** بـ`npm run verify-content`. متعدلوش بإيدك.
> أي حقل هنا بيظهر في الموقع كـ"محتاج تأكيد" مش كرقم.
> **متحطش رقم من دماغك عشان تفضّي القايمة.** ناس بتاخد قرارات بفلوسها على الأرقام دي.

**آخر تحديث للملف ده:** 2026-08-26

**الحالة دلوقتي:** 30 ولاية · 50 مدينة · 2 شيك ليست — إجمالي 1302 حقل.

| الحالة | العدد | معناها في الواجهة |
|---|---|---|
| `verified` | 18 | من غير بادج، المصدر في الفوتنوت |
| `estimated` | 512 | بادج "تقديري"، والbasis في tooltip |
| `judgment` | 130 | من غير بادج — بيتعرض كوصف مش كرقم |
| `NEEDS_VERIFICATION` | 642 | بادج "محتاج تأكيد"، ومفيش رقم |

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

130 حقل حالتهم `judgment`. دي أحكام شخصية مش قياسات — مفيش مصدر بيرتب المدن رقميًا عليها.

- **بتتعرض كوصف مش كرقم.** "جالية عربية كبيرة" — مش "٤ من ٥".
- الرقم داخلي للترتيب في محرك الخطة بس، ووزنه مسقوف في `lib/planner/judgment.ts`.
- لو لقيت مصدر فعلًا بيرتب واحد منهم رقميًا، حوّله `estimated` أو `verified`.

---

## ⏰ عدّى ميعاد مراجعته

مفيش حاجة متأخرة دلوقتي. ✅

---

## 📋 كل الحقول الناقصة

642 حقل، في 94 ملف.

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

<details><summary><code>eligibility.json</code> — 6</summary>

- `criteria[0].eligibleCountries` — قايمة الدول المؤهلة للدورة الحالية — بتتغير كل سنة، انسخها من الصفحة الرسمية
- `criteria[0].spouseParentException` — الشروط الدقيقة للاستثناء عن طريق الزوج/الزوجة أو الوالدين
- `criteria[1].educationRequirement` — المؤهل المطلوب بالظبط
- `criteria[1].experienceRequirement` — شروط مسار الخبرة العملية — المهن المؤهلة ومدة الخبرة والفترة الزمنية
- `criteria[2].registrationWindow` — مواعيد فتح وقفل التسجيل للدورة الحالية
- `criteria[2].registrationFee` — رسم التسجيل الحالي

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

<details><summary><code>jobs\amazon-flex.json</code> — 5</summary>

- `needsCar` — بعض المدن بتسمح بالعجل أو السكوتر — اتأكد للمدينة نفسها
- `minCarYear` — بيختلف من مدينة لمدينة
- `needsEnglish` — مستوى الإنجليزي المطلوب فعليًا للشغل
- `activationDays` — مدة فحص الخلفية والتفعيل
- `requiresSSN`

</details>

<details><summary><code>jobs\doordash.json</code> — 5</summary>

- `needsCar` — بعض المدن بتسمح بالعجل أو السكوتر — اتأكد للمدينة نفسها
- `minCarYear` — بيختلف من مدينة لمدينة
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

<details><summary><code>jobs\lyft.json</code> — 5</summary>

- `needsCar` — بعض المدن بتسمح بالعجل أو السكوتر — اتأكد للمدينة نفسها
- `minCarYear` — بيختلف من مدينة لمدينة
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

<details><summary><code>jobs\uber.json</code> — 5</summary>

- `needsCar` — بعض المدن بتسمح بالعجل أو السكوتر — اتأكد للمدينة نفسها
- `minCarYear` — بيختلف من مدينة لمدينة
- `needsEnglish` — مستوى الإنجليزي المطلوب فعليًا للشغل
- `activationDays` — مدة فحص الخلفية والتفعيل
- `requiresSSN`

</details>

<details><summary><code>jobs\walmart-spark.json</code> — 5</summary>

- `needsCar` — بعض المدن بتسمح بالعجل أو السكوتر — اتأكد للمدينة نفسها
- `minCarYear` — بيختلف من مدينة لمدينة
- `needsEnglish` — مستوى الإنجليزي المطلوب فعليًا للشغل
- `activationDays` — مدة فحص الخلفية والتفعيل
- `requiresSSN`

</details>

<details><summary><code>metros\arlington-va.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\atlanta-ga.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\austin-tx.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\baltimore-md.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\boston-ma.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\buffalo-ny.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\charlotte-nc.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\chicago-il.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\cincinnati-oh.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\cleveland-oh.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\columbus-oh.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\dallas-tx.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\dearborn-mi.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\denver-co.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\des-moines-ia.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\hartford-ct.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\houston-tx.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\indianapolis-in.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\jersey-city-nj.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\kansas-city-mo.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\las-vegas-nv.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\los-angeles-ca.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\louisville-ky.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\memphis-tn.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\miami-fl.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\milwaukee-wi.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\minneapolis-mn.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\nashville-tn.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\nyc-ny.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\oklahoma-city-ok.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\omaha-ne.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\orlando-fl.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\paterson-nj.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\philadelphia-pa.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\phoenix-az.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\pittsburgh-pa.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\portland-or.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\raleigh-nc.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\richmond-va.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\sacramento-ca.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\salt-lake-city-ut.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\san-antonio-tx.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\san-diego-ca.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\san-francisco-ca.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\seattle-wa.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\silver-spring-md.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\st-louis-mo.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\tampa-fl.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\tucson-az.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>metros\virginia-beach-va.json</code> — 9</summary>

- `car.carFreeNeighborhoods` — أنهي أحياء بالظبط ينفع تعيش فيها من غير عربية
- `car.monthlyTransitPass`
- `costs.securityDeposit` — من غير credit غالبًا بيطلبوا أكتر
- `costs.utilities`
- `costs.carInsurance`
- `work.worksWithoutEnglish`
- `work.warehouseJobs`
- `life.halalAccess`
- `life.schoolQuality`

</details>

<details><summary><code>states\AZ.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\CA.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\CO.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\CT.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\FL.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\GA.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\IA.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\IL.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\IN.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\KY.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\MA.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\MD.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\MI.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\MN.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\MO.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\NC.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\NE.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\NJ.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\NV.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\NY.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\OH.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\OK.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\OR.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\PA.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\TN.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\TX.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\UT.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\VA.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\WA.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>states\WI.json</code> — 3</summary>

- `incomeTaxRate` — الشرايح والنسب — من موقع الولاية
- `licenseProcess` — محتاج SSN؟ فيه فترة انتظار؟ الاختبار متاح بالعربي؟ من موقع DMV الولاية.
- `salesTax`

</details>

<details><summary><code>steps.json</code> — 11</summary>

- `steps[0].durationDays`
- `steps[1].durationDays`
- `steps[2].durationDays`
- `steps[3].durationDays`
- `steps[4].durationDays`
- `steps[5].durationDays`
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

## إزاي تأكّد حقل

1. افتح المصدر الرسمي وشوف الرقم بعينك
2. غيّر `value` و `status: "verified"` و `lastVerified` لتاريخ النهاردة
3. حط اللينك المباشر في `sources`
4. `npm run verify-content` تاني

> ولو الرقم تقديري مش مؤكد: `status: "estimated"` **لازم** معاه `basis` (التقدير جه منين)
> و `verifyIn` (يتراجع كل قد إيه). من غيرهم الـbuild بيفشل.
