// Turns the logo drawing (dark lines on cream) into a transparent cut-out, plus icons.
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
  const d = x.getImageData(0, 0, c.width, c.height);
  // darkness becomes opacity; the cream background drops out
  let minX = c.width, minY = c.height, maxX = 0, maxY = 0;
  for (let i = 0; i < d.data.length; i += 4) {
    const lum = (d.data[i] * .3 + d.data[i + 1] * .59 + d.data[i + 2] * .11) / 255;
    const a = Math.max(0, Math.min(1, (0.93 - lum) / 0.6));
    d.data[i] = d.data[i + 1] = d.data[i + 2] = 0; d.data[i + 3] = Math.round(a * 255);
    if (a > .1) { const p = i / 4, px = p % c.width, py = Math.floor(p / c.width); minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py); }
  }
  x.putImageData(d, 0, 0);
  const pad = 6, w = maxX - minX + pad * 2, h = maxY - minY + pad * 2;
  const t = document.createElement("canvas"); t.width = w; t.height = h;
  t.getContext("2d").drawImage(c, minX - pad, minY - pad, w, h, 0, 0, w, h);

  // square icons: drawing in forest green on linen
  const icon = (size, bg = "#F6F0E6", ink = "#2E4A39") => {
    const k = document.createElement("canvas"); k.width = k.height = size;
    const g = k.getContext("2d");
    g.fillStyle = bg; g.fillRect(0, 0, size, size);
    const inner = size * .78, s = Math.min(inner / w, inner / h);
    const tint = document.createElement("canvas"); tint.width = w; tint.height = h;
    const tg = tint.getContext("2d"); tg.drawImage(t, 0, 0); tg.globalCompositeOperation = "source-in"; tg.fillStyle = ink; tg.fillRect(0, 0, w, h);
    g.drawImage(tint, (size - w * s) / 2, (size - h * s) / 2, w * s, h * s);
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
