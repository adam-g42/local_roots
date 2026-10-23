// Bakes the world's coastlines for the food-miles globe into src/js/land.json:
// Natural Earth 110m land (via world-atlas), as [lng, lat] rings rounded to 0.1°, Antarctica left off.
// Run once: npm run land
import { writeFile } from "node:fs/promises";

const res = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json");
const topo = await res.json();
const { scale, translate } = topo.transform;

// topojson arcs are delta-encoded and quantised
const arcs = topo.arcs.map((arc) => {
  let x = 0, y = 0;
  return arc.map(([dx, dy]) => {
    x += dx; y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
});
const ring = (ids) => ids.flatMap((i, n) => {
  const a = i < 0 ? [...arcs[~i]].reverse() : arcs[i];
  return n ? a.slice(1) : a;
});

const round = (v) => Math.round(v * 10) / 10;
const rings = [];
for (const geom of topo.objects.land.geometries) {
  const polys = geom.type === "Polygon" ? [geom.arcs] : geom.arcs;
  for (const poly of polys) {
    const outer = ring(poly[0]);
    if (outer.every(([, lat]) => lat < -60)) continue;
    // drop points that round to the same place as the one before
    const pts = [];
    for (const [lng, lat] of outer) {
      const p = [round(lng), round(lat)];
      const last = pts[pts.length - 1];
      if (!last || last[0] !== p[0] || last[1] !== p[1]) pts.push(p);
    }
    if (pts.length > 3) rings.push(pts);
  }
}

await writeFile(new URL("../src/js/land.json", import.meta.url), JSON.stringify(rings));
console.log(`${rings.length} rings, ${rings.reduce((n, r) => n + r.length, 0)} points`);
