// Trims each character drawing (on a transparent background) and saves it at web size.
// Sources: scripts/characters/*.png, kept out of src/ so the full-size files aren't published.
// Output: src/images/characters/, same names. Run `npm run characters` after adding or replacing one.
import { chromium } from "playwright-core";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const chrome = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ executablePath: chrome });
const page = await browser.newPage();

for (const name of readdirSync("scripts/characters").filter((f) => f.endsWith(".png"))) {
  const src = "data:image/png;base64," + readFileSync(`scripts/characters/${name}`).toString("base64");
  const out = await page.evaluate(async (src) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const x = c.getContext("2d"); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    // trim to the drawing, ignoring rows and columns with only a few solid pixels (stray specks), as the logo script does
    const cols = new Uint32Array(c.width), rows = new Uint32Array(c.height);
    for (let i = 3; i < d.length; i += 4) if (d[i] > 25) { const p = (i - 3) / 4; cols[p % c.width]++; rows[Math.floor(p / c.width)]++; }
    const edges = (counts) => { const min = 6; let a = 0, b = counts.length - 1; while (a < b && counts[a] < min) a++; while (b > a && counts[b] < min) b--; return [a, b]; };
    const [minX, maxX] = edges(cols), [minY, maxY] = edges(rows);
    const pad = 8, cw = maxX - minX + pad * 2, ch = maxY - minY + pad * 2;

    // the page shows them at most about 9rem (144px) tall, so 320px stays sharp on 2x screens
    const s = Math.min(1, 320 / ch), w = Math.round(cw * s), h = Math.round(ch * s);
    const t = document.createElement("canvas"); t.width = w; t.height = h;
    const tg = t.getContext("2d"); tg.imageSmoothingQuality = "high";
    tg.drawImage(c, minX - pad, minY - pad, cw, ch, 0, 0, w, h);
    return { url: t.toDataURL("image/png"), w, h, corner: d[3] };
  }, src);
  writeFileSync(`src/images/characters/${name}`, Buffer.from(out.url.split(",")[1], "base64"));
  console.log(`${name}: ${out.w}×${out.h}${out.corner ? "  (warning: corner isn't transparent)" : ""}`);
}
await browser.close();
