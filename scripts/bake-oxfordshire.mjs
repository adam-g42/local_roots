// Bakes the country round Oxford for the food-miles globe's close-up into src/js/oxfordshire.json:
// rivers, motorways and trunk roads, and towns from OpenStreetMap (© OpenStreetMap contributors, ODbL),
// simplified and rounded so the file stays small. Run once: npm run oxfordshire
import { writeFile } from "node:fs/promises";

// the whole close-up: about 27 miles each way from Cowley, past the furthest farm (Watchfield, 21 miles)
const BBOX = "51.35,-1.88,52.14,-0.58";
const query = `[out:json][timeout:150];
(
  way["waterway"="river"](${BBOX});
  way["highway"~"^(motorway|trunk)$"](${BBOX});
  node["place"~"^(city|town)$"](${BBOX});
);
out geom;`;

// Overpass turns away requests that don't say who they're from
const res = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  headers: { "User-Agent": "local-roots-site-build/1.0", "Content-Type": "application/x-www-form-urlencoded" },
  body: "data=" + encodeURIComponent(query),
});
if (!res.ok) throw new Error(`Overpass said ${res.status}; try again in a minute`);
const { elements } = await res.json();

// Douglas-Peucker on a flat local grid; 0.0008° is about 60m, finer than the close-up can show
const K = Math.cos((51.75 * Math.PI) / 180);
function simplify(pts, tol = .0008) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = (bx - ax) * K, dy = by - ay, len = Math.hypot(dx, dy) || 1e-12;
  let far = 0, at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * (pts[i][0] - ax) * K - dx * (pts[i][1] - ay)) / len;
    if (d > far) { far = d; at = i; }
  }
  if (far <= tol) return [pts[0], pts[pts.length - 1]];
  return [...simplify(pts.slice(0, at + 1), tol).slice(0, -1), ...simplify(pts.slice(at), tol)];
}
const round = (v) => Math.round(v * 2000) / 2000;
const line = (geometry) => simplify(geometry.map((p) => [p.lon, p.lat])).map(([x, y]) => [round(x), round(y)]);

const out = { rivers: [], roads: [], places: [] };
for (const e of elements) {
  const t = e.tags || {};
  if (e.type === "way" && t.waterway) out.rivers.push({ name: t.name || "", main: t.name === "River Thames", line: line(e.geometry) });
  else if (e.type === "way" && t.highway) out.roads.push({ kind: t.highway, line: line(e.geometry) });
  else if (e.type === "node" && t.name) out.places.push({ name: t.name, kind: t.place, at: [round(e.lon), round(e.lat)] });
}

await writeFile(new URL("../src/js/oxfordshire.json", import.meta.url), JSON.stringify(out));
console.log(`${out.rivers.length} rivers, ${out.roads.length} roads, ${out.places.length} towns`);
