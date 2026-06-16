import { existsSync } from "node:fs";
import { buildCheckHtml } from "@/lib/pdf-template";
import type { CheckRecord } from "@/lib/types";

/**
 * Renders the signed-check PDF from an HTML template using headless Chromium
 * via puppeteer-core, which handles Hebrew RTL and font shaping natively.
 *
 * We use puppeteer-core (no bundled Chromium) and drive the system browser
 * (Chrome/Edge) to avoid the heavy Chromium download. Override with the env
 * var PUPPETEER_EXECUTABLE_PATH. The browser is cached on globalThis.
 */

interface GlobalWithBrowser {
  __checktrackBrowser?: Promise<import("puppeteer-core").Browser>;
}

const BROWSER_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  process.env.LOCALAPPDATA
    ? `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`
    : "",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].filter(Boolean) as string[];

function resolveExecutablePath(): string {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const found = BROWSER_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      "לא נמצא דפדפן Chromium. הגדר PUPPETEER_EXECUTABLE_PATH לנתיב Chrome/Edge.",
    );
  }
  return found;
}

async function getBrowser(): Promise<import("puppeteer-core").Browser> {
  const g = globalThis as unknown as GlobalWithBrowser;
  if (!g.__checktrackBrowser) {
    const puppeteer = (await import("puppeteer-core")).default;
    g.__checktrackBrowser = puppeteer.launch({
      executablePath: resolveExecutablePath(),
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return g.__checktrackBrowser;
}

export async function renderCheckPdf(opts: {
  record: CheckRecord;
  checkImageDataUrl?: string | null;
  signatureDataUrl?: string | null;
}): Promise<Uint8Array> {
  const html = buildCheckHtml(opts);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    // Wait for the web fonts to load so the PDF renders with the right faces.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
    });
  } finally {
    await page.close();
  }
}
