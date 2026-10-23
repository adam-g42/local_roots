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
  const baked = {};
  // wobbles one path's line: amp is how far the pen strays either side
  const wobble = (d, amp) => {
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
        const w = amp * (Math.sin(t * .045 + s) * .6 + Math.sin(t * .11 + s * 2.3) * .3 + Math.sin(t * .27 + s * 3.1) * .1);
        pts.push([q.x + nx * w, q.y + ny * w]);
      }
      tmp.remove();
      parts.push("M" + pts.map(([x, y]) => x.toFixed(1) + " " + y.toFixed(1)).join("L") + (/z\s*$/i.test(sub.trim()) ? "Z" : ""));
    }
    return parts.join("");
  };
  for (const path of group.querySelectorAll("path")) {
    // fine detail (trees, terraces, landmarks) is drawn with its own character, so it isn't wobbled
    if (path.closest(".map__compass, [data-crisp]")) continue;
    // the paper-coloured middle of a double-lined road follows its edges' wobble, then strays a touch on its own,
    // so each edge line swells and thins like a real pen
    if (path.dataset.twin) { path.setAttribute("d", wobble(baked[path.dataset.twin], .55)); path.removeAttribute("data-twin"); continue; }
    path.setAttribute("d", wobble(path.getAttribute("d"), 1.5));
    if (path.dataset.key) { baked[path.dataset.key] = path.getAttribute("d"); path.removeAttribute("data-key"); }
  }
  group.querySelectorAll("[data-crisp]").forEach(g => g.removeAttribute("data-crisp"));
  // the middles of the double-lined roads are cut out of their edges rather than painted over, so the paper
  // shows through: the middle paths become a mask (white keeps, black cuts) on the edge lines
  const cut = group.querySelector(".map__road--fill");
  if (cut) {
    const ns = "http://www.w3.org/2000/svg", mask = document.createElementNS(ns, "mask"), keep = document.createElementNS(ns, "rect");
    mask.id = "road-middles"; mask.setAttribute("maskUnits", "userSpaceOnUse");
    for (const el of [mask, keep]) { el.setAttribute("x", "-2000"); el.setAttribute("y", "-2000"); el.setAttribute("width", "6000"); el.setAttribute("height", "6000"); }
    keep.setAttribute("fill", "#fff");
    cut.removeAttribute("class"); cut.setAttribute("stroke", "#000");
    cut.querySelectorAll("path").forEach(path => path.removeAttribute("pathLength"));
    mask.append(keep, cut);
    const edges = group.querySelector(".map__road");
    edges.before(mask);
    edges.setAttribute("mask", "url(#road-middles)");
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
