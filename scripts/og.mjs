// Re-draws src/images/brand/og-share.jpg (the picture shown when the site is shared) from site.json.
// Needs Google Chrome installed and the dev server running: `npm start`, then `npm run og`.
import { chromium } from "playwright-core";

const chrome = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ executablePath: chrome });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto("http://localhost:8080/og-image/", { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: "src/images/brand/og-share.jpg", type: "jpeg", quality: 88 });
await browser.close();
console.log("Saved src/images/brand/og-share.jpg");
