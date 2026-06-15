import { test, expect, type Page } from "@playwright/test";

// Screen 3 — /sign/[token]. Invalid token + the one-time-lock security property.

async function drawSignature(page: Page) {
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("signature canvas not found");
  await page.mouse.move(box.x + 30, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 90);
  await page.mouse.move(box.x + 150, box.y + 50);
  await page.mouse.up();
}

/** Create a not-delivered check and return a signing token URL for it. */
async function createCheckWithLink(request: import("@playwright/test").APIRequestContext) {
  const num = "REM-" + Date.now();
  await request.post("/api/checks", {
    data: { checkNumber: num, recipientName: "ספק מרחוק", writtenDate: "2026-09-01", amount: 4200 },
  });
  const share = await request.post(`/api/share/${num}`);
  const { url } = await share.json();
  return { num, url: new URL(url).pathname };
}

test.describe("Screen 3 — remote signing", () => {
  test("invalid token shows an error", async ({ page }) => {
    await page.goto("/sign/this.is.not-valid");
    await expect(page.getByText("הקישור אינו תקין")).toBeVisible();
  });

  test("valid link shows check details and blocks empty submit", async ({ page, request }) => {
    const { url } = await createCheckWithLink(request);
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "אישור קבלת צ'ק" })).toBeVisible();
    await page.getByRole("button", { name: "אישור ושליחה" }).click();
    await expect(page.getByText("יש להזין את שמך המלא")).toBeVisible();
  });

  // Security regression: a signing link must be one-time only.
  test("link is locked after a successful signature", async ({ page, request }) => {
    const { url } = await createCheckWithLink(request);

    await page.goto(url);
    await page.getByRole("textbox", { name: "שם החותם המלא" }).fill("משה לוי");
    await drawSignature(page);
    await page.getByRole("button", { name: "אישור ושליחה" }).click();
    await expect(page.getByText("החתימה נקלטה בהצלחה, תודה!")).toBeVisible({ timeout: 15000 });

    // Reopening the same link must be rejected.
    await page.goto(url);
    await expect(page.getByText("הצ'ק כבר נחתם")).toBeVisible();
  });
});
