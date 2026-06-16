import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

// Screen 2 — /dashboard row actions ("שתף שוב" / "החתמה לצד").

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

async function seedNotDelivered(request: APIRequestContext, prefix: string) {
  const num = prefix + "-" + Date.now();
  await request.post("/api/checks", {
    data: { checkNumber: num, recipientName: "ספק דשבורד", writtenDate: "2026-09-03", amount: 800 },
  });
  return num;
}

test.describe("Screen 2 — dashboard actions", () => {
  test('"שתף שוב" opens a share panel with a signing link', async ({ page, request }) => {
    const num = await seedNotDelivered(request, "DASH");
    await page.goto("/dashboard"); // default tab = not delivered
    const row = page.getByRole("row", { name: new RegExp(num) });
    await row.getByRole("button", { name: "שתף שוב" }).click();
    await expect(page.getByRole("link", { name: "שליחה בוואטסאפ" })).toBeVisible();
  });

  test('"החתמה לצד" delivers the check and clears it from the not-delivered tab', async ({ page, request }) => {
    const num = await seedNotDelivered(request, "SIDE");
    await page.goto("/dashboard");
    const row = page.getByRole("row", { name: new RegExp(num) });
    await row.getByRole("button", { name: "החתמה לצד" }).click();
    await page.getByRole("textbox", { name: "שם החותם המלא" }).fill("חותם לצד");
    await drawSignature(page);
    await page.getByRole("button", { name: "אישור וסגירה" }).click();
    // After signing it leaves the (default) not-delivered tab.
    await expect(page.getByRole("row", { name: new RegExp(num) })).toHaveCount(0, {
      timeout: 20000,
    });
  });
});
