// Draws the engraved detail on the map (river ripples, terraces, trees, hachures) and writes it into
// scripts/map-source.svg. Run `npm run map:details` after moving a road, street or park, then `npm run map`.
// The roads, streets and parks below are copies of the ones in the source; keep them in step.
// A fixed seed means the same input always gives the same drawing.
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await b.newPage();
const out = await p.evaluate(() => {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg"); document.body.appendChild(svg);
  const mk = d => { const e = document.createElementNS(ns, "path"); e.setAttribute("d", d); svg.appendChild(e); return e; };
  let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const f = n => (Math.round(n * 10) / 10).toString();
  const pt = (path, s) => path.getPointAtLength(Math.max(0, Math.min(path.getTotalLength(), s)));
  const frame = (path, s) => {
    const a = pt(path, s - .5), c = pt(path, s + .5), q = pt(path, s);
    let tx = c.x - a.x, ty = c.y - a.y; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
    return { x: q.x, y: q.y, tx, ty, nx: -ty, ny: tx };
  };
  const off = (path, s, d) => { const k = frame(path, s); return [k.x + k.nx * d, k.y + k.ny * d]; };
  const line = pts => "M" + pts.map(([x, y]) => f(x) + " " + f(y)).join("L");
  // a quick pen never lands exactly where it means to
  const j = a => (rnd() - .5) * 2 * a;
  const shaky = (pts, a) => line(pts.map(([x, y]) => [x + j(a), y + j(a)]));

  // ---- river ripples: broken lines following each bank, fading outward like an engraving
  const thames = mk("M290-20c40 70 58 140 70 210 14 80 30 160 70 230 24 30 56 34 84 26 40-10 76 20 98 54 30 46 70 76 100 120 22 36 32 80 44 140");
  const cherwell = mk("M630-20c14 60 24 120 26 180 2 60 8 120-6 170-10 30-30 54-36 86-6 30-6 60-10 82");
  const ripples = [[], [], []];
  for (const [river, rings] of [[thames, [7.5, 11.5, 16]], [cherwell, [6, 9.5, 13.5]]]) {
    const L = river.getTotalLength();
    rings.forEach((r, i) => {
      for (const side of [-1, 1]) {
        let s = rnd() * 20;
        while (s < L) {
          const len = (14 + rnd() * 40) * (1 - i * .25), seg = [];
          for (let t = s; t < Math.min(L, s + len); t += 6) seg.push(off(river, t, side * (r + Math.sin(t * .05 + i) * .7)));
          if (seg.length > 1) ripples[i].push(shaky(seg, .4));
          s += len + 5 + rnd() * (10 + i * 10);
        }
      }
    });
  }

  // ---- terraces: rows of little houses either side of each street, with party walls
  const P = { x: 690, y: 360 };
  const streets = "M749 396Q736 416 719 425M795 409Q765 452 733 469M824 444Q793 488 739 518M865 464Q821 526 742 568M907 482Q848 565 751 614M946 505Q880 611 777 652M980 534Q893 635 776 701M1018 558Q917 673 786 746|M744 390Q746 353 736 330M779 408Q784 349 764 304M817 415Q832 345 795 281M852 435Q869 341 824 257".split(/\||(?=M)/);
  const blocks = [], walls = [];
  const terrace = (path, from, to, near, far) => {
    for (const side of [-1, 1]) {
      let s = from + rnd() * 4;
      while (s < to - 8) {
        // each row set back a little differently, its corners never quite square
        const len = Math.min(to - s, 14 + rnd() * 30), n0 = near + j(.7), f0 = far + j(1.2), a = [], c = [];
        for (let t = s; ; t = Math.min(t + 9, s + len)) { a.push(off(path, t, side * n0)); c.push(off(path, t, side * f0)); if (t >= s + len) break; }
        blocks.push(shaky([...a, ...c.reverse()], .5) + "Z");
        for (let t = s + 5; t < s + len - 2; t += 5 + rnd() * 1.5) if (rnd() > .2) walls.push(shaky([off(path, t + j(.6), side * n0), off(path, t + j(.6), side * f0)], .35));
        s += len + 5 + rnd() * 12;
      }
    }
  };
  for (const d of streets) { const e = mk(d), L = e.getTotalLength(); terrace(e, 9, L - 9, 3.5, 8.5); }
  // shops and houses along the main roads, broken where each side street comes in
  const cowley = mk("M690 360c50 24 100 50 150 76 60 30 110 64 170 104 60 40 120 80 200 130");
  const iffley = mk("M690 360c14 50 30 100 44 160 16 70 30 140 50 290");
  const clements = mk("M690 360c24-22 48-44 80-70 40-34 80-70 120-110 40-40 80-90 110-200");
  const mainRows = [], mainWalls = [];
  for (const [road, from, to] of [[cowley, 40, 470], [iffley, 50, 420], [clements, 40, 190]]) {
    const L = road.getTotalLength();
    for (const side of [-1, 1]) {
      let s = from + rnd() * 6;
      while (s < Math.min(L, to)) {
        const len = 16 + rnd() * 28, n0 = 6 + j(.7), f0 = 11.5 + j(1.4), a = [], c = [];
        for (let t = s; ; t = Math.min(t + 9, s + len)) { a.push(off(road, t, side * n0)); c.push(off(road, t, side * f0)); if (t >= s + len) break; }
        mainRows.push(shaky([...a, ...c.reverse()], .5) + "Z");
        for (let t = s + 6; t < s + len - 2; t += 6) if (rnd() > .2) mainWalls.push(shaky([off(road, t + j(.6), side * n0), off(road, t + j(.6), side * f0)], .35));
        s += len + 9 + rnd() * 6;
      }
    }
  }

  // ---- trees: little scalloped crowns with a shadow stroke, around park edges and scattered inside
  // each crown lumpy in its own way, the pen lifting just short of where it started
  const tree = (x, y, r) => {
    const n = 5 + Math.round(rnd()), parts = [], turn = rnd() * Math.PI;
    for (let i = 0; i <= n; i++) {
      const a = turn + i / n * Math.PI * 2 - (i === n ? .25 : 0), rr = r * (.82 + rnd() * .36);
      parts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * .9]);
    }
    let d = `M${f(parts[0][0])} ${f(parts[0][1])}`;
    for (let i = 1; i < parts.length; i++) { const k = r * (.38 + rnd() * .16); d += `A${f(k)} ${f(k)} 0 0 1 ${f(parts[i][0])} ${f(parts[i][1])}`; }
    return { crown: d, trunk: `M${f(x + j(.3))} ${f(y + r * .85)}l${f(j(.7))} ${f(r * (.6 + rnd() * .3))}`, shade: `M${f(x + r * (.1 + rnd() * .3))} ${f(y + r * 1.2 + j(.3))}h${f(r * (1 + rnd() * .6))}` };
  };
  const parks = {
    meadow: "M550 366C582 362 612 364 640 368C632 392 618 410 612 436C608 458 606 476 602 490C580 478 556 464 530 454C536 424 542 394 550 366Z",
    uniparks: "M542 84C572 78 606 74 640 72C648 110 654 150 656 186C655 200 654 212 652 222C620 224 590 224 556 226C552 180 546 132 542 84Z",
    southpark: "M902 228C924 196 948 164 972 116C1010 124 1048 140 1084 160C1092 196 1090 236 1078 268C1040 286 998 296 958 300C934 278 916 254 902 228Z",
  };
  const trees = { crown: [], trunk: [], shade: [] };
  const add = t => { trees.crown.push(t.crown); trees.trunk.push(t.trunk); trees.shade.push(t.shade); };
  const placed = [];
  const free = (x, y, d) => placed.every(([a, c]) => Math.hypot(a - x, c - y) > d);
  for (const [name, d] of Object.entries(parks)) {
    const e = mk(d), L = e.getTotalLength();
    // an avenue along the edge, set just inside
    const step = name === "southpark" ? 15 : 11;
    for (let s = 0; s < L; s += step + rnd() * 4) {
      if (name === "southpark" && rnd() < .35) continue;
      const k = frame(e, s), inset = 6;
      // inward normal: test which side is inside
      const ix = k.x + k.nx * inset, iy = k.y + k.ny * inset;
      const inside = e.isPointInFill(new DOMPoint(ix, iy));
      const x = inside ? ix : k.x - k.nx * inset, y = inside ? iy : k.y - k.ny * inset;
      if (free(x, y, 8)) { placed.push([x, y]); add(tree(x, y, 3 + rnd() * 1.2)); }
    }
    // scattered inside (not on the meadow, which is open grazing)
    const bb = e.getBBox(), want = name === "uniparks" ? 26 : name === "southpark" ? 10 : 0;
    let tries = 0, got = 0;
    while (got < want && tries++ < 2000) {
      const x = bb.x + rnd() * bb.width, y = bb.y + rnd() * bb.height;
      if (!e.isPointInFill(new DOMPoint(x, y)) || !free(x, y, 13)) continue;
      // keep away from the edge avenue
      placed.push([x, y]); add(tree(x, y, 3.2 + rnd() * 1.6)); got++;
    }
  }

  // ---- hachures: short strokes running downhill off Headington Hill, longer where it's steeper
  const hach = [];
  const C = { x: 1112, y: 28 };
  for (const [r0, maxL] of [[58, 22], [88, 14]]) {
    for (let a = 70; a <= 215; a += 3.2 + rnd() * 1.4) {
      const rad = a * Math.PI / 180, steep = Math.sin((a - 70) / 145 * Math.PI);
      const L = maxL * (.45 + .55 * steep) * (.85 + rnd() * .3), r = r0 + rnd() * 3;
      const x1 = C.x + Math.cos(rad) * r, y1 = C.y + Math.sin(rad) * r;
      const x2 = C.x + Math.cos(rad + .03) * (r + L), y2 = C.y + Math.sin(rad + .03) * (r + L);
      // keep the hill off the road and out of the park
      const park = mk(parks.southpark);
      const hitPark = park.isPointInFill(new DOMPoint(x2, y2)) || park.isPointInFill(new DOMPoint(x1, y1));
      park.remove();
      const roadX = y => 890 + (180 - y) * .55; // rough line of Headington Road here
      if (hitPark || x2 < roadX(y2) + 10 || x1 < roadX(y1) + 10) continue;
      hach.push(shaky([[x1, y1], [x2, y2]], .6));
    }
  }

  return {
    ripples: ripples.map(r => r.join("")),
    blocks: blocks.join(""), walls: walls.join(""),
    mainRows: mainRows.join(""), mainWalls: mainWalls.join(""),
    crowns: trees.crown.join(""), trunks: trees.trunk.join(""), shades: trees.shade.join(""),
    hachures: hach.join(""),
  };
});
// drop each set of paths into its place in the source, found by class
const source = "scripts/map-source.svg";
let svg = readFileSync(source, "utf8");
const put = (pattern, d) => {
  let n = 0;
  svg = svg.replace(pattern, (_, a, z) => (n++, a + d + z));
  if (n !== 1) throw new Error("Couldn't find " + pattern + " in " + source);
};
const byClass = c => new RegExp(`(<path class="${c}" d=")[^"]*(")`);
out.ripples.forEach((d, i) => put(byClass(`map__ripple-${i + 1}`), d));
put(byClass("map__house-rows"), out.mainRows + out.blocks);
put(byClass("map__house-walls"), out.mainWalls + out.walls);
put(byClass("map__tree-shade"), out.shades);
put(byClass("map__tree-trunk"), out.trunks);
put(byClass("map__tree-crown"), out.crowns);
put(/(<g class="map__hachures" data-crisp="">\s*<path d=")[^"]*(")/, out.hachures);
writeFileSync(source, svg);
await b.close();
console.log("Updated", source);
