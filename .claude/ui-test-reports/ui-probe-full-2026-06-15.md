# UI Probe — CheckTrack (whole app)

- **Date:** 2026-06-15
- **Scope:** Whole app (Screens 1–3) in dev mode (`CHECKTRACK_DEV_MODE=true`, auth bypassed, in-memory store)
- **Driver:** Playwright MCP against system Chrome, `http://localhost:3000`
- **Build state under test:** Phases 0–8 + Phase 7 auth (dev-bypass)

## Summary

CheckTrack held up well under adversarial input. Required-field validation,
amount validation, XSS-safe rendering, the signature gates, and the **one-time
remote-signing lock** all behaved correctly. One real correctness bug was found
(duplicate check number falsely reported as saved) plus two low-severity items.

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 0 |
| Medium | 1 |
| Low | 2 |

## Findings

### 🟠 #1 (Medium) — Duplicate check number on "שמור כלא נמסר" falsely reports success
- **Screen/element:** `/capture` → "שמור כלא נמסר" button.
- **Repro:**
  1. Save a check with number `50001` (valid) → success.
  2. Enter the same number `50001` again with a *different* recipient/amount and click "שמור כלא נמסר".
- **Observed:** UI shows green **"הצ'ק נשמר כ\"לא נמסר\" בהצלחה"** and clears the form, while the API actually returned **409 Conflict** (visible in the console) and stored nothing. The dashboard confirmed `50001` was **unchanged** (original recipient/amount) and **no new row** was created — the just-typed data was silently discarded.
- **Impact:** A clerk can believe a check was recorded when it was not. Risk of an untracked check — the exact failure mode the system exists to prevent.
- **Root cause:** In [components/../capture/page.tsx](../../app/(app)/capture/page.tsx), `createCheck()` treats HTTP 409 as success (`if (res.status === 409) return true;`). That shortcut is intentional for the *frontal/remote signing* flows (sign an existing check), but "שמור כלא נמסר" reuses it and so reports success on a duplicate.
- **Fix:** Make `createCheck` distinguish "create" (409 → error) from "create-or-reuse" (409 → continue). Applied — see regression test `duplicate-save.spec.ts`.
- **Evidence:** accessibility snapshot showed `paragraph: הצ'ק נשמר כ"לא נמסר" בהצלחה` immediately after `POST /api/checks → 409`; dashboard then listed only 2 rows with `50001` unchanged. Form screenshot: `ui-probe-full-2026-06-15/screen1-capture-form.png`.

### 🟡 #2 (Low) — "שתף שוב" swallows API errors silently
- **Screen/element:** `/dashboard` → "שתף שוב" (share again).
- **Detail:** `shareAgain()` wraps the request in `try/catch {}` with no user feedback (`// surfaced minimally for now`). If `/api/share` fails (e.g. the check was delivered elsewhere → 409), the user sees nothing happen.
- **Impact:** Confusing no-op on error. The happy path works correctly (panel with WhatsApp/email/copy renders).
- **Suggested fix:** Surface an error toast/message on failure.

### 🟡 #3 (Low) — Missing `favicon.ico` (404)
- Every page logs a `404` for `/favicon.ico`. Cosmetic; add an icon to `app/`.

## What was tested and passed ✅

**Screen 1 — `/capture`**
- Empty submit → all 4 required fields flagged with clear Hebrew errors.
- Negative amount (`-100`) → "סכום הצ'ק לא תקין" (client-side, no API call); fields retained.
- Valid happy path → success + form reset; row created.
- XSS payload `"><img src=x onerror=alert(...)>` in recipient → stored and rendered as **literal text** on the dashboard (React-escaped); no script execution, no element injection.

**Screen 2 — `/dashboard`**
- Default tab = "לא נמסרו" with live count; archive tab shows all + extra columns (מסירה/חותם/קובץ) + PDF link.
- "החתמה לצד": empty name → blocked; name without signature → blocked; full signature → status flips to **נמסר**, signer + timestamp recorded, signed **PDF generated** (Hebrew RTL), counts updated.
- "שתף שוב" → share panel with prefilled WhatsApp/email/copy links + valid signing token.

**Screen 3 — `/sign/[token]`**
- Invalid token → "הקישור אינו תקין".
- Valid token → correct details sentence (company/number/amount/date).
- Empty submit → "יש להזין את שמך המלא"; name without signature → "יש לחתום במשטח החתימה".
- Full sign → "החתימה נקלטה בהצלחה, תודה!".
- **One-time lock:** reopening the consumed link → "הצ'ק כבר נחתם" (security property holds).

## Coverage

| Screen | Controls covered |
|---|---|
| `/` home | 2/2 links |
| `/capture` | form 4/4 fields, 3/3 action buttons, signature dialog, share panel |
| `/dashboard` | 2/2 tabs, 2/2 row actions, signature dialog, share modal, PDF link |
| `/sign/[token]` | invalid + valid + used states, name + signature + submit |

## Environment notes
- The Playwright MCP writes snapshots/screenshots into `.playwright-mcp/` **inside the project**, which Next's dev file-watcher detected → continuous HMR recompiles. During a recompile, clicks occasionally didn't register (interactivity briefly lost). This is a **test-harness artifact**, not an app bug. Mitigation: `.playwright-mcp/` is now git-ignored; for future probes, run the dev server with that path excluded from the watcher or use `next build && next start`.
- Auth was in dev-bypass (no Google creds). The login-gate redirect (auth enabled) was not exercised live; its logic is covered by unit tests of `lib/auth-config.ts`.
