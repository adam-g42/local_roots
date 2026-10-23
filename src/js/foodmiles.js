// "How far it travels": a globe in the hero map's sepia ink. Pick a vegetable and the supermarket's one makes its
// trip to Oxford while the globe turns to follow it; then it zooms in on Cowley until our farms can be told apart.
// The coastlines are in land.json (npm run land); the trips and distances come from _data/foodmiles.js.

(() => {
  const svg = document.querySelector("[data-globe]");
  if (!svg) return;
  const data = JSON.parse(document.getElementById("foodmiles").textContent);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";
  const RAD = Math.PI / 180;

  // the globe, in viewBox units
  const C = [320, 290], R = 250;

  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const fmt = (n) => Math.round(n).toLocaleString("en-GB");

  // ---------- the sphere: d3-geo does the projection, and clips land and lines at the horizon ----------

  // clipped just outside the globe's outline too, since zoomed in on Oxford the world is far bigger than the page
  const projection = d3.geoOrthographic().translate(C).scale(R).clipAngle(90)
    .clipExtent([[C[0] - R - 20, C[1] - R - 20], [C[0] + R + 20, C[1] + R + 20]]).precision(.3);
  const path = d3.geoPath(projection);
  const angle = d3.geoDistance;
  const between = (a, b, t) => d3.geoInterpolate(a, b)(t);
  const xy = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  // where a point lands on screen, and whether it's on the front of the globe
  const project = (pt, centre) => [...projection(pt), angle(pt, centre) < Math.PI / 2];
  const line = (points) => path({ type: "LineString", coordinates: points }) || "";
  const grid = d3.geoGraticule().step([30, 30])();

  // a dense copy of a route: a point every degree or so, each knowing its leg's mode and the miles so far
  function trace(legs) {
    const pts = [];
    let miles = 0;
    for (const leg of legs) {
      for (let i = 1; i < leg.path.length; i++) {
        const a = leg.path[i - 1], b = leg.path[i], d = angle(a, b), n = Math.max(1, Math.ceil(d / RAD));
        for (let k = pts.length ? 1 : 0; k <= n; k++) {
          const at = between(a, b, k / n);
          if (pts.length) miles += angle(pts[pts.length - 1].at, at) * 3958.8;
          pts.push({ at, by: leg.by, miles });
        }
      }
    }
    return pts;
  }
  // the spot a given distance along a traced route
  function along(pts, miles) {
    let i = 1;
    while (i < pts.length - 1 && pts[i].miles < miles) i++;
    const a = pts[i - 1], b = pts[i], t = clamp((miles - a.miles) / (b.miles - a.miles || 1), 0, 1);
    return { at: between(a.at, b.at, t), by: b.by, i };
  }

  // ---------- the drawing ----------

  const el = (name, attrs = {}, parent = svg) => {
    const n = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    parent.append(n);
    return n;
  };

  const defs = el("defs");
  el("circle", { cx: C[0], cy: C[1], r: R }, el("clipPath", { id: "globe-clip" }, defs));

  // the globe's outline stays put as it zooms, like a porthole the world grows inside
  const world = el("g", { "clip-path": "url(#globe-clip)" });
  const sea = el("circle", { class: "globe__sea", cx: C[0], cy: C[1], r: R }, world);
  // ripples just inside the rim, like the river's on the Oxford map
  const ripples = [1, 2, 3].map((i) => el("circle", { class: `globe__ripple globe__ripple-${i}`, cx: C[0], cy: C[1] }, world));
  const gridLine = el("path", { class: "globe__grid" }, world);
  const land = el("path", { class: "globe__land" }, world);
  const plan = el("path", { class: "globe__plan" }, world);
  const trail = el("path", { class: "globe__trail" }, world);
  el("circle", { class: "globe__rim", cx: C[0], cy: C[1], r: R });

  const origin = el("circle", { class: "globe__origin", r: 5 });
  const originLabel = el("text", { class: "globe__label" });

  // the vehicles: a plane seen from above turns to its heading; the lorry and ship are side-on and only flip
  const vehicle = el("g", { class: "globe__vehicle" });
  const glyphs = {
    air: el("path", { d: "M11 0C11-1.4 9-2 6-2H1L-4.5-10H-7.5L-4-2H-8.5L-11-5.5H-13L-11.5 0L-13 5.5H-11L-8.5 2H-4L-7.5 10H-4.5L1 2H6C9 2 11 1.4 11 0Z" }, vehicle),
    sea: el("path", { d: "M-13 1H13L9.5 7H-10Z M-9 1V-3H-1V1 M-7.5-3V-7H-4V-3 M1 1V-4H8V1 M1-1.5H8" }, vehicle),
    road: el("path", { d: "M-13-7H3V4H-13Z M3-2.5H8.5L12 1V4H3Z M-9 6.5a2 2 0 1 0 .1 0Z M-4 6.5a2 2 0 1 0 .1 0Z M7.5 6.5a2 2 0 1 0 .1 0Z" }, vehicle),
  };

  // ---------- our farms: too close to Cowley to see on the globe, so it zooms in on them ----------

  const HOME = data.home.at;
  // close enough that the furthest farm sits 200 units from Cowley: a few hundred times the globe's scale
  const ZOOM = (200 * 3958.8) / Math.max(data.ours, 2);
  const farms = el("g", { class: "farms-near" });
  // rings every 5 miles around Cowley, out past the furthest farm
  const rings = [];
  for (let m = 5; m <= Math.max(10, Math.ceil(data.ours / 5) * 5); m += 5) {
    const ring = el("circle", { class: "farms-near__ring" }, farms);
    const label = el("text", { class: "farms-near__ring-label", "text-anchor": "middle" }, farms);
    label.textContent = `${m} miles`;
    rings.push({ m, ring, label });
  }
  // the supermarket's trip, named where it comes in over the edge
  const theirsLabel = el("text", { class: "globe__label farms-near__theirs", "text-anchor": "middle" }, farms);
  const farmMarks = data.farms.map((f) => {
    const route = el("path", { class: "farms-near__route" }, farms);
    const dot = el("circle", { class: "farms-near__farm", r: 4.5 }, farms);
    const label = el("text", { class: "globe__label farms-near__label", "text-anchor": "middle" }, farms);
    label.innerHTML = `<tspan x="0">${f.name}</tspan><tspan x="0" dy="1.05em" class="farms-near__miles">${f.miles} ${f.miles === 1 ? "mile" : "miles"}</tspan>`;
    return { f, route, dot, label };
  });
  const home = el("circle", { class: "globe__home", r: 5 });
  const homeLabel = el("text", { class: "globe__label farms-near__label farms-near__label--home", "text-anchor": "middle" }, farms);
  homeLabel.textContent = data.home.name;

  // ---------- drawing one moment ----------

  const land$ = fetch("/js/land.json").then((r) => r.json());
  let earth = null;
  let centre = [0, 30], scale = R;
  let trip, pts, miles = 0;

  // how far zoomed in we are, 0 at the globe and 1 at our farms
  const zoomed = () => clamp(Math.log(scale / R) / Math.log(ZOOM / R), 0, 1);

  function draw() {
    projection.scale(scale).rotate([-centre[0], -centre[1]]);
    sea.setAttribute("r", scale);
    ripples.forEach((c, i) => c.setAttribute("r", Math.max(0, scale - (i + 1) * 8.5)));
    gridLine.setAttribute("d", path(grid) || "");
    land.setAttribute("d", path(earth) || "");

    const at = along(pts, miles);
    plan.setAttribute("d", line(pts.map((p) => p.at)));
    trail.setAttribute("d", line([...pts.slice(0, at.i).map((p) => p.at), at.at]));

    const o = project(pts[0].at, centre);
    origin.setAttribute("cx", o[0]); origin.setAttribute("cy", o[1]);
    // the origin's name sits on the outer side of its dot
    const right = o[0] >= C[0];
    originLabel.setAttribute("x", o[0] + (right ? 10 : -10));
    originLabel.setAttribute("y", o[1] + 5);
    originLabel.setAttribute("text-anchor", right ? "start" : "end");
    originLabel.textContent = trip.place;
    originLabel.style.opacity = o[2] ? 1 : 0;

    // the vehicle, pointing the way it's going on screen
    const p = project(at.at, centre), q = project(along(pts, Math.max(0, miles - 40)).at, centre);
    const heading = Math.atan2(p[1] - q[1], p[0] - q[0]) / RAD;
    for (const [mode, g] of Object.entries(glyphs)) g.style.display = mode === at.by ? "" : "none";
    const turn = at.by === "air" ? `rotate(${heading.toFixed(1)})` : `scale(${Math.abs(heading) > 90 ? -1 : 1} 1)`;
    vehicle.setAttribute("transform", `translate(${xy(p)}) ${turn}`);
    vehicle.style.opacity = p[2] && miles < pts[pts.length - 1].miles ? 1 : 0;

    // Cowley, and our farms coming into focus as the globe zooms in
    const h = projection(HOME);
    home.setAttribute("cx", h[0]); home.setAttribute("cy", h[1]);
    homeLabel.setAttribute("x", h[0]); homeLabel.setAttribute("y", h[1] - 14);
    for (const { f, route, dot, label } of farmMarks) {
      const [x, y] = projection(f.at);
      route.setAttribute("d", `M${xy([x, y])}L${xy(h)}`);
      dot.setAttribute("cx", x); dot.setAttribute("cy", y);
      // a name sits over its dot, or under it when the farm is due south, so it never crosses the line in
      const below = y - h[1] > Math.abs(x - h[0]);
      label.setAttribute("transform", `translate(${xy([x, below ? y + 24 : y - 32])})`);
    }
    for (const { m, ring, label } of rings) {
      const r = (m / 3958.8) * scale;
      ring.setAttribute("cx", h[0]); ring.setAttribute("cy", h[1]); ring.setAttribute("r", r);
      label.setAttribute("x", h[0]); label.setAttribute("y", h[1] - r - 5);
    }
    // the supermarket's name goes out along its last mile in, most of the way to the edge
    const end = pts[pts.length - 1].miles;
    const [ex, ey] = projection(along(pts, end - 1).at);
    const d = Math.hypot(ex - h[0], ey - h[1]) || 1;
    theirsLabel.setAttribute("x", h[0] + ((ex - h[0]) / d) * R * .68);
    theirsLabel.setAttribute("y", h[1] + ((ey - h[1]) / d) * R * .68 - 12);
    theirsLabel.textContent = `from ${trip.place}, ${fmt(trip.miles)} miles`;

    const z = zoomed();
    farms.style.opacity = clamp((z - .75) / .2, 0, 1);
    zoomButton.textContent = z > .5 ? "Zoom out to the whole trip" : "Zoom in to our farms";
  }

  // ---------- moving the camera ----------

  // runs step(t) for t from 0 to 1 over ms; a newer run cancels it
  let run = 0;
  const tween = (ms, step, id) => new Promise((done) => {
    if (!ms) { step(1); draw(); return done(); }
    const t0 = performance.now();
    const frame = (now) => {
      if (id !== run) return;
      const t = Math.min(1, (now - t0) / ms);
      step(t); draw();
      t < 1 ? requestAnimationFrame(frame) : done();
    };
    requestAnimationFrame(frame);
  });
  const wait = (ms, id) => new Promise((done) => setTimeout(() => id === run && done(), ms));

  const routeMid = () => along(pts, pts[pts.length - 1].miles / 2).at;

  // turn to face Cowley, then dive straight down onto it
  async function zoomIn(id, animate) {
    const from = centre, s0 = scale;
    await tween(animate ? 300 + angle(from, HOME) / RAD * 12 : 0, (t) => { centre = between(from, HOME, ease(t)); }, id);
    await tween(animate ? 2800 : 0, (t) => { scale = s0 * (ZOOM / s0) ** ease(t); }, id);
  }
  // rise straight up from Cowley, then turn back to the middle of the trip
  async function zoomOut(id, animate) {
    const s0 = scale;
    await tween(animate ? 1600 : 0, (t) => { scale = s0 * (R / s0) ** ease(t); }, id);
    const from = centre, to = routeMid();
    await tween(animate ? 300 + angle(from, to) / RAD * 9 : 0, (t) => { centre = between(from, to, ease(t)); }, id);
  }

  // ---------- the panel ----------

  const theirs = document.querySelector("[data-theirs]");
  const how = document.querySelector("[data-theirs-how]");
  const times = document.querySelector("[data-times]");
  const desc = document.querySelector("[data-globe-desc]");
  const zoomButton = document.querySelector("[data-zoom]");

  async function play(index, animate) {
    const id = ++run;
    trip = data.trips[index];
    pts = trip.pts ??= trace(trip.legs);
    const total = pts[pts.length - 1].miles;
    // the view settles over the middle of the route, so both ends show
    const mid = routeMid();
    const start = between(pts[0].at, mid, .5);

    how.textContent = `by ${trip.by} from ${trip.from}`;
    times.textContent = "";
    desc.textContent = `A globe showing the route a supermarket's ${trip.produce.toLowerCase()} takes from ${trip.from} to Oxford, ${fmt(trip.miles)} miles. Zoomed in on Oxford, it shows Local Roots' farms, all within ${data.ours} miles of Cowley.`;

    if (!animate) {
      scale = R; centre = mid; miles = total;
      draw();
      theirs.textContent = fmt(trip.miles);
      times.textContent = `That's about ${fmt(trip.times)} times further.`;
      return;
    }

    miles = 0;
    theirs.textContent = "0";
    if (scale > R) await zoomOut(id, true);
    // turn to the start, then follow the trip; short trips go quicker
    const from = centre;
    await tween(300 + angle(from, start) / RAD * 9, (t) => { centre = between(from, start, ease(t)); }, id);
    await tween(1400 + 2600 * Math.min(1, trip.miles / 6000), (t) => {
      centre = between(start, mid, ease(t));
      miles = total * ease(t);
      theirs.textContent = fmt(trip.miles * ease(t));
    }, id);
    times.textContent = `That's about ${fmt(trip.times)} times further.`;
    // then go and find ours
    await wait(900, id);
    await zoomIn(id, true);
  }

  const picked = () => Number(document.querySelector(".miles__pick input:checked")?.value || 0);
  document.querySelectorAll(".miles__pick input").forEach((input) => {
    input.addEventListener("change", () => land$.then(() => play(picked(), !reduce)));
  });
  zoomButton.addEventListener("click", () => {
    if (!earth) return;
    const id = ++run;
    zoomed() > .5 ? zoomOut(id, !reduce) : zoomIn(id, !reduce);
  });

  // the first trip plays once, when the globe comes into view
  land$.then((rings) => {
    earth = { type: "MultiPolygon", coordinates: rings.map((r) => [[...r, r[0]]]) };
    zoomButton.hidden = false;
    play(picked(), false);
    if (reduce) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      centre = [centre[0] + 70, centre[1] - 10];
      play(picked(), true);
    }, { threshold: .45 });
    io.observe(svg);
  });

  // the labels stay a readable size as the globe shrinks on small screens
  new ResizeObserver(() => {
    svg.style.setProperty("--k", clamp(640 / (svg.clientWidth || 640), 1, 1.6));
  }).observe(svg);
})();
