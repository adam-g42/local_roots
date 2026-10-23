// Bakes a pen wobble into scripts/map-source.svg and writes src/_includes/map.svg.
// Edit the source map (it uses a live SVG filter as a guide), then run `npm run map`.
// Baking means no filter is needed in the browser, so the draw-in animation stays smooth.
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";
const source = "scripts/map-source.svg", target = "src/_includes/map.svg";
const svg = readFileSync(source, "utf8");
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await b.newPage();
await p.setContent(`<body>${svg}</body>`);
const out = await p.evaluate(() => {
  const root = document.querySelector("svg");
  const group = root.querySelector("g[filter]");
  let seed = 1;
  for (const path of group.querySelectorAll("path")) {
    if (path.closest(".map__compass")) continue;
    const len = path.getTotalLength();
    const d = path.getAttribute("d");
    const closed = /z\s*$/i.test(d.trim());
    // subpaths (several "M"s) are handled one at a time
    const subs = d.split(/(?=M)/).filter(Boolean);
    const parts = [];
    for (const sub of subs) {
      const tmp = document.createElementNS("http://www.w3.org/2000/svg", "path");
      tmp.setAttribute("d", sub); group.appendChild(tmp);
      const L = tmp.getTotalLength(), step = 4, n = Math.max(2, Math.ceil(L / step));
      const s = seed++ * 1.7, pts = [];
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * L;
        const a = tmp.getPointAtLength(Math.max(0, t - .5)), c = tmp.getPointAtLength(Math.min(L, t + .5)), q = tmp.getPointAtLength(t);
        let nx = -(c.y - a.y), ny = c.x - a.x; const m = Math.hypot(nx, ny) || 1; nx /= m; ny /= m;
        const w = 1.5 * (Math.sin(t * .045 + s) * .6 + Math.sin(t * .11 + s * 2.3) * .3 + Math.sin(t * .27 + s * 3.1) * .1);
        pts.push([q.x + nx * w, q.y + ny * w]);
      }
      tmp.remove();
      parts.push("M" + pts.map(([x, y]) => x.toFixed(1) + " " + y.toFixed(1)).join("L") + (/z\s*$/i.test(sub.trim()) ? "Z" : ""));
    }
    path.setAttribute("d", parts.join(""));
  }
  group.removeAttribute("filter");
  root.querySelector("#pen")?.remove();
  return root.outerHTML;
});
const tidy = out
  .replace(/ xmlns="http:\/\/www.w3.org\/2000\/svg"/, "")
  .replace("<!-- a little wobble so every line looks drawn with a dip pen -->", "<!-- the pen wobble is baked into the path data (no live filter), so the draw-in animates smoothly -->")
  .replace(/\n\s*\n/g, "\n");
writeFileSync(target, tidy + "\n");
await b.close();
console.log("Saved", target);
