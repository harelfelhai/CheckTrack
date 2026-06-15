import { test, expect } from "@playwright/test";

// Screen 1 — /capture. Adversarial input + the Finding #1 regression.

test.describe("Screen 1 — capture", () => {
  test("empty submit flags all required fields", async ({ page }) => {
    await page.goto("/capture");
    await page.getByRole("button", { name: "שמור כלא נמסר" }).click();
    await expect(page.getByText(/מספר צ'ק חסר/)).toBeVisible();
    await expect(page.getByText(/שם המקבל חסר/)).toBeVisible();
    await expect(page.getByText(/סכום הצ'ק לא תקין/)).toBeVisible();
  });

  test("negative amount is rejected", async ({ page }) => {
    await page.goto("/capture");
    await page.getByRole("textbox", { name: "שם החברה / המקבל" }).fill("ספק");
    await page.getByRole("textbox", { name: "מספר צ'ק" }).fill("NEG-" + Date.now());
    await page.getByRole("textbox", { name: "סכום הצ'ק (₪)" }).fill("-100");
    await page.getByRole("textbox", { name: "תאריך כתיבה" }).fill("2026-08-08");
    await page.getByRole("button", { name: "שמור כלא נמסר" }).click();
    await expect(page.getByText("סכום הצ'ק לא תקין")).toBeVisible();
  });

  // Regression for Finding #1 (Medium): a duplicate check number must NOT be
  // reported as a successful save.
  test("duplicate check number shows an error, not success", async ({ page, request }) => {
    const num = "DUP-" + Date.now();
    const seed = await request.post("/api/checks", {
      data: { checkNumber: num, recipientName: "ראשון", writtenDate: "2026-08-06", amount: 1000 },
    });
    expect(seed.ok()).toBeTruthy();

    await page.goto("/capture");
    await page.getByRole("textbox", { name: "שם החברה / המקבל" }).fill("שני");
    await page.getByRole("textbox", { name: "מספר צ'ק" }).fill(num);
    await page.getByRole("textbox", { name: "סכום הצ'ק (₪)" }).fill("2000");
    await page.getByRole("textbox", { name: "תאריך כתיבה" }).fill("2026-08-07");
    await page.getByRole("button", { name: "שמור כלא נמסר" }).click();

    await expect(page.getByText(/כבר קיים/)).toBeVisible();
    await expect(page.getByText(/נשמר.*בהצלחה/)).toHaveCount(0);
  });

  test("XSS payload in recipient renders as text on the dashboard", async ({ page, request }) => {
    const num = "XSS-" + Date.now();
    const payload = "\"><img src=x onerror=alert('xss')>";
    await request.post("/api/checks", {
      data: { checkNumber: num, recipientName: payload, writtenDate: "2026-08-09", amount: 100 },
    });
    let alertFired = false;
    page.on("dialog", async (d) => {
      alertFired = true;
      await d.dismiss();
    });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /ארכיון כל הצ'קים/ }).click();
    await expect(page.getByRole("cell", { name: payload })).toBeVisible();
    expect(alertFired).toBe(false);
  });
});
