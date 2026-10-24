// Trims the colour logo drawing (on a transparent background) and saves it at web size, plus icons.
// Source: src/images/brand/logo-source.png. Run `npm run logo` after replacing it.
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

const chrome = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const src = "data:image/png;base64," + readFileSync("src/images/brand/logo-source.png").toString("base64");
const browser = await chromium.launch({ executablePath: chrome });
const page = await browser.newPage();

const out = await page.evaluate(async (src) => {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const x = c.getContext("2d"); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  // trim to the drawing: count solid pixels per row and column, and ignore rows and columns with only a few,
  // so stray specks of paint far from the drawing don't widen the crop
  const cols = new Uint32Array(c.width), rows = new Uint32Array(c.height);
  for (let i = 3; i < d.length; i += 4) if (d[i] > 25) { const p = (i - 3) / 4; cols[p % c.width]++; rows[Math.floor(p / c.width)]++; }
  const edges = (counts) => { const min = 6; let a = 0, b = counts.length - 1; while (a < b && counts[a] < min) a++; while (b > a && counts[b] < min) b--; return [a, b]; };
  const [minX, maxX] = edges(cols), [minY, maxY] = edges(rows);
  const pad = 8, cw = maxX - minX + pad * 2, ch = maxY - minY + pad * 2;

  // the page shows it at most 9rem (144px) tall, so 320px stays sharp on 2x screens
  const s = Math.min(1, 320 / ch), w = Math.round(cw * s), h = Math.round(ch * s);
  const t = document.createElement("canvas"); t.width = w; t.height = h;
  const tg = t.getContext("2d"); tg.imageSmoothingQuality = "high";
  tg.drawImage(c, minX - pad, minY - pad, cw, ch, 0, 0, w, h);

  // square icons: the drawing on linen, scaled from the full-size source so the big icon stays sharp
  const icon = (size, bg = "#F6F0E6") => {
    const k = document.createElement("canvas"); k.width = k.height = size;
    const g = k.getContext("2d"); g.imageSmoothingQuality = "high";
    g.fillStyle = bg; g.fillRect(0, 0, size, size);
    const inner = size * .8, f = Math.min(inner / cw, inner / ch);
    g.drawImage(c, minX - pad, minY - pad, cw, ch, (size - cw * f) / 2, (size - ch * f) / 2, cw * f, ch * f);
    return k.toDataURL("image/png");
  };
  return { mark: t.toDataURL("image/png"), w, h, i192: icon(192), i512: icon(512), i180: icon(180) };
}, src);

const save = (file, url) => writeFileSync(file, Buffer.from(url.split(",")[1], "base64"));
save("src/images/brand/logo-mark.png", out.mark);
save("src/images/brand/icon-192.png", out.i192);
save("src/images/brand/icon-512.png", out.i512);
save("src/images/brand/apple-touch-icon.png", out.i180);
await browser.close();
console.log(`Saved src/images/brand/ (mark ${out.w}×${out.h})`);
