# CheckTrack

מערכת מעקב, החתמה ותיעוד של **צ'קים יוצאים** — מרגע כתיבת הצ'ק ועד הפקדתו אצל
הספק/לקוח. בנויה ב-Next.js (App Router, TypeScript), ממשק בעברית RTL, mobile-first.
בסיס הנתונים והאחסון הם **Google Sheets** (טבלת ריכוז) ו-**Google Drive** (קבצי PDF).

> תוכנית הבנייה המלאה: ראו `אפיון_מערכת_CheckTrack_סופי.pdf` ואת קובץ התוכנית בתיקיית התוכניות.

## הרצה מקומית

```bash
npm install
cp .env.local.example .env.local   # ערכו לפי הצורך
npm run dev                        # http://localhost:3000
```

ב-`CHECKTRACK_DEV_MODE=true` (ברירת המחדל) המערכת רצה עם אחסון בזיכרון (mock)
ללא צורך בהגדרת Google כלל — נוח לפיתוח ובדיקות.

## מסכים

1. **`/capture`** — קליטת צ'ק חדש: צילום/סריקה, טופס פרטים (כל שדה ניתן לעריכה
   ידנית), ובחירת פעולת מסירה (שמור כלא נמסר / החתמה פרונטלית / שליחת לינק מרחוק).
2. **`/dashboard`** — בקרה ומעקב: טאב "לא נמסרו" (ברירת מחדל) + טאב "ארכיון".
3. **`/sign/[token]`** — דף ציבורי לחתימת ספק חיצוני דרך לינק חד-פעמי.

## הגדרת Google (כאשר עוברים מ-dev mode לפרודקשן)

1. צרו פרויקט ב-[Google Cloud Console](https://console.cloud.google.com/).
2. הפעילו **Google Drive API** ו-**Google Sheets API**.
3. הגדירו **OAuth consent screen** וצרו **OAuth Client (Web application)**.
4. הפיקו **refresh token** של חשבון החברה עם הרשאות offline ל-Drive+Sheets.
5. צרו Google Sheet עם טאב `Checks` ו-8 הכותרות, ותיקייה ייעודית ב-Drive;
   שתפו את שתיהן עם חשבון החברה.
6. מלאו את הערכים ב-`.env.local` והעבירו את `CHECKTRACK_DEV_MODE` ל-`false`.

### חשוב לחשבון Gmail אישי (ללא Workspace)
הלקוח עובד עם **Gmail אישי + Google One** (אחסון מוגדל), לא Workspace:
- **העבירו את אפליקציית ה-OAuth ל-"Production"** (ולא "Testing") — אחרת ה-refresh
  token פג כל 7 ימים והשרת מאבד גישה ל-Drive/Sheets פעם בשבוע.
- **התחברות מסכים 1–2** מתבצעת מול **allowlist אימיילים** (`AUTH_ALLOWED_EMAILS`),
  לא מול דומיין ארגוני.
- כדי להימנע מאימות כבד של גוגל, מומלץ שהאפליקציה **תיצור בעצמה** את ה-Sheet
  והתיקייה (הרשאת `drive.file` המצומצמת) במקום שיתוף ידני.
- הדוא"ל הארגוני על Microsoft אינו רלוונטי — השיתוף (`mailto`) נפתח בצד הלקוח
  ב-Outlook; איננו שולחים מייל מהשרת.

## OCR (חילוץ אוטומטי, אופציונלי)

מסך הקליטה כולל כפתור **"חילוץ אוטומטי (OCR)"** שממלא מספר/סכום/תאריך מתמונת
הצ'ק — כל שדה נשאר פתוח לעריכה ידנית. ה-OCR מבוסס **Google Cloud Vision** ומופעל
רק כשמוגדר `GOOGLE_VISION_API_KEY`; בלעדיו הכפתור מציג הודעה ולא מתבצעת קריאה בתשלום.

להפעלה: צרו API key ל-Vision באותו פרויקט Google Cloud, מלאו `GOOGLE_VISION_API_KEY`
ב-`.env.local`. עלות: ~$1.5 ל-1000 תמונות (1000 ראשונות/חודש חינם). מומלץ להריץ
תחילה מדגם קטן (תמונה אחת) לאימות לפני שימוש בנפח.

## פריסה (Deploy)

האפליקציה מייצרת PDF דרך Chromium (puppeteer-core). לכן:
- **שרת Node מלא** (Render / Google Cloud Run / VM): התקינו Chrome/Chromium על השרת
  והגדירו `PUPPETEER_EXECUTABLE_PATH`. זו הדרך הפשוטה.
- **Serverless (Vercel/Lambda)**: יש להוסיף `@sparticuz/chromium` ולהשתמש בו כ-
  `executablePath` במקום דפדפן מערכת (ה-PDF רץ ב-runtime של Node, לא Edge).

## סקריפטים

| פקודה | תיאור |
|---|---|
| `npm run dev` | שרת פיתוח |
| `npm run build` | בילד פרודקשן |
| `npm run typecheck` | בדיקת טיפוסים (tsc) |
| `npm test` | בדיקות יחידה (vitest) |
