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
  // a gentle ease in and out, and the part of a move between two fractions of its time, eased on its own
  const ease = (t) => (1 - Math.cos(Math.PI * clamp(t, 0, 1))) / 2;
  const part = (t, from, to) => ease((t - from) / (to - from));
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
  // the country round Oxford, drawn as on the hero map; it fades in as the globe zooms down to it
  // it fades out softly round its edge rather than stopping at the square the map data was cut to
  const fade = el("radialGradient", { id: "shire-fade", gradientUnits: "userSpaceOnUse" }, defs);
  el("stop", { offset: .8, "stop-color": "#fff" }, fade);
  el("stop", { offset: 1, "stop-color": "#000" }, fade);
  el("rect", { x: -9999, y: -9999, width: 19998, height: 19998, fill: "url(#shire-fade)" }, el("mask", { id: "shire-mask", maskUnits: "userSpaceOnUse", x: -9999, y: -9999, width: 19998, height: 19998 }, defs));
  const shire = el("g", { class: "shire", mask: "url(#shire-mask)" }, world);
  const shireRivers = el("path", { class: "shire__river" }, shire);
  const shireThames = el("path", { class: "shire__river shire__river--main" }, shire);
  const shireRoads = el("path", { class: "shire__road" }, shire);
  const plan = el("path", { class: "globe__plan" }, world);
  const trail = el("path", { class: "globe__trail" }, world);
  el("circle", { class: "globe__rim", cx: C[0], cy: C[1], r: R });

  const shireLabels = el("g", { class: "close-names", "clip-path": "url(#globe-clip)" });

  const origin = el("circle", { class: "globe__origin", r: 5, "clip-path": "url(#globe-clip)" });
  // the origin's name shows only while the globe is still, so it never slides about with it
  const originLabel = el("text", { class: "globe__label still-names" });

  // the vehicles: a plane seen from above turns to its heading; the lorry and ship are side-on and only flip
  const vehicle = el("g", { class: "globe__vehicle", "clip-path": "url(#globe-clip)" });
  const glyphs = {
    air: el("path", { d: "M11 0C11-1.4 9-2 6-2H1L-4.5-10H-7.5L-4-2H-8.5L-11-5.5H-13L-11.5 0L-13 5.5H-11L-8.5 2H-4L-7.5 10H-4.5L1 2H6C9 2 11 1.4 11 0Z" }, vehicle),
    sea: el("path", { d: "M-13 1H13L9.5 7H-10Z M-9 1V-3H-1V1 M-7.5-3V-7H-4V-3 M1 1V-4H8V1 M1-1.5H8" }, vehicle),
    road: el("path", { d: "M-13-7H3V4H-13Z M3-2.5H8.5L12 1V4H3Z M-9 6.5a2 2 0 1 0 .1 0Z M-4 6.5a2 2 0 1 0 .1 0Z M7.5 6.5a2 2 0 1 0 .1 0Z" }, vehicle),
  };

  // ---------- our farms: too close to Cowley to see on the globe, so it zooms in on them ----------

  const HOME = data.home.at;
  // close enough that the furthest farm sits 200 units from Cowley: a few hundred times the globe's scale
  const ZOOM = (200 * 3958.8) / Math.max(data.ours, 2);
  // kept inside the globe's outline, so nothing swings out past it as the view zooms
  const farms = el("g", { class: "farms-near", "clip-path": "url(#globe-clip)" });
  // our journey: the line in from whichever farm this item comes from, drawn as the van makes it
  const ourRoute = el("path", { class: "farms-near__route" }, farms);
  const van = el("path", { class: "globe__vehicle", d: glyphs.road.getAttribute("d") }, farms);
  // each farm is a numbered pin, matching the list of suppliers beside the globe; the one in use stands out
  const farmMarks = data.farms.map((f, i) => {
    const pin = el("g", { class: "farms-near__pin" }, farms);
    el("circle", { r: 10 }, pin);
    el("text", { "text-anchor": "middle", dy: ".35em" }, pin).textContent = i + 1;
    return { f, pin };
  });
  const home = el("circle", { class: "globe__home", r: 5 }, farms);
  // the close-up's names are placed once the zoom has settled and fade in then, rather than riding the zoom
  const names = el("g", { class: "close-names" }, farms);
  const homeLabel = el("text", { class: "globe__label farms-near__home", "text-anchor": "middle" }, names);
  homeLabel.textContent = data.home.name;
  // the supermarket's trip, named where it comes in over the edge
  const theirsLabel = el("text", { class: "globe__label farms-near__theirs", "text-anchor": "middle" }, names);
  // and ours, named at its farm
  const oursLabel = el("text", { class: "globe__label farms-near__ours", "text-anchor": "middle" }, names);

  // ---------- drawing one moment ----------

  const land$ = fetch("/js/land.json").then((r) => r.json());
  let earth = null, oxon = null;
  land$.then(() => fetch("/js/oxfordshire.json")).then((r) => r.json()).then((o) => {
    const multi = (ways) => ({ type: "MultiLineString", coordinates: ways.map((w) => w.line) });
    oxon = {
      rivers: multi(o.rivers.filter((r) => !r.main)),
      thames: multi(o.rivers.filter((r) => r.main)),
      roads: multi(o.roads),
      // the city first, then the towns nearest Cowley, so the names that matter most get room
      places: o.places
        .map((p) => ({ ...p, rank: (p.kind === "city" ? 0 : 1000) + angle(p.at, HOME) * 3958.8 }))
        .sort((a, b) => a.rank - b.rank)
        .map((p) => ({ ...p, label: el("text", { class: `shire__label shire__label--${p.kind}`, "text-anchor": "middle" }, shireLabels) })),
    };
    oxon.places.forEach((p) => (p.label.textContent = p.name));
  });
  let centre = [0, 30], scale = R;
  // how much bigger than drawn size the lettering and pins are, so they read on small screens
  let k = 1;
  // how far along the trip, in miles, and how far along our own journey in, from 0 to 1
  let trip, pts, miles = 0, local = 0;

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
    origin.style.visibility = o[2] ? "" : "hidden";
    // the origin's name sits on the outer side of its dot
    const right = o[0] >= C[0];
    originLabel.setAttribute("x", o[0] + (right ? 10 : -10));
    originLabel.setAttribute("y", o[1] + 5);
    originLabel.setAttribute("text-anchor", right ? "start" : "end");
    originLabel.textContent = trip.place;
    originLabel.style.visibility = o[2] ? "" : "hidden";

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
    for (const mark of farmMarks) {
      mark.xy = projection(mark.f.at);
      mark.pin.setAttribute("transform", `translate(${xy(mark.xy)}) scale(${k})`);
    }
    const [fx, fy] = farmMarks[trip.farm].xy;
    const [vx, vy] = [fx + (h[0] - fx) * local, fy + (h[1] - fy) * local];
    ourRoute.setAttribute("d", local ? `M${xy([fx, fy])}L${xy([vx, vy])}` : "");
    van.setAttribute("transform", `translate(${xy([vx, vy])}) scale(${(h[0] < fx ? -.8 : .8) * k} ${.8 * k})`);
    van.style.opacity = local > 0 && local < 1 ? 1 : 0;

    const z = zoomed();
    // the world's coastlines are too coarse to zoom far into, so they dissolve as Oxfordshire comes in
    const coarse = 1 - part(z, .35, .7);
    sea.style.opacity = land.style.opacity = gridLine.style.opacity = coarse;
    farms.style.opacity = clamp((z - .75) / .2, 0, 1);
    drawShire(z);
  }

  // The lines on the close-up that names must keep off: our line in, and the supermarket's last stretch out to the
  // globe's edge (last, so its own label can tell it apart).
  let lines = [];
  function closeUpLines(h) {
    const [ex, ey] = projection(along(pts, pts[pts.length - 1].miles - 1).at);
    const d = Math.hypot(ex - h[0], ey - h[1]) || 1;
    lines = [[farmMarks[trip.farm].xy, h], [h, [h[0] + ((ex - h[0]) / d) * R, h[1] + ((ey - h[1]) / d) * R]]];
    return lines;
  }
  // whether a line passes through a box, checked every couple of units along it
  const crosses = (b, [[x1, y1], [x2, y2]]) => {
    const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 2);
    for (let i = 0; i <= n; i++) {
      const x = x1 + ((x2 - x1) * i) / n, y = y1 + ((y2 - y1) * i) / n;
      if (x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1) return true;
    }
    return false;
  };
  const clearOf = (b, taken) => !taken.some((t) => overlaps(t, b)) && !lines.some((l) => crosses(b, l));

  // A name goes in the first of the spots round its point (over, under, either side, then the corners, then the
  // same further and further out) that's clear of the other names and the lines, and inside the globe.
  // `at` comes back as where the label's own transform should move it.
  function placeBeside(label, [x, y], taken) {
    const b = measured(label), w = b.x1 - b.x0, hgt = b.y1 - b.y0, midY = (b.y0 + b.y1) / 2;
    const spots = [];
    for (const gap of [8, 22, 40, 60]) {
      const dx = w / 2 + gap, dy = hgt / 2 + gap;
      for (const [sx, sy] of [[0, -1], [0, 1], [1, 0], [-1, 0], [1, -1], [-1, -1], [1, 1], [-1, 1]]) {
        spots.push([x + sx * dx, y + sy * dy - midY]);
      }
    }
    const boxes = spots.map((at) => ({ at, box: measured(label, at) }));
    // failing a clear spot, one inside the globe that only crosses a line, then any inside it
    const spot = boxes.find((s) => within(s.box) && clearOf(s.box, taken))
      || boxes.find((s) => within(s.box) && !taken.some((t) => overlaps(t, s.box)))
      || boxes.find((s) => within(s.box)) || boxes[0];
    taken.push(spot.box);
    return spot.at;
  }


  // the close-up's rivers, roads and names; names that would overlap one already placed are left off
  function drawShire(z) {
    const show = oxon && z > .5;
    shire.style.opacity = show ? clamp((z - .55) / .3, 0, 1) : 0;
    if (!show) return;
    // the map data reaches about 27 miles out from Cowley; the fade finishes just inside that
    const [fx, fy] = projection(HOME);
    fade.setAttribute("cx", fx); fade.setAttribute("cy", fy); fade.setAttribute("r", (26 / 3958.8) * scale);
    shireRivers.setAttribute("d", path(oxon.rivers) || "");
    shireThames.setAttribute("d", path(oxon.thames) || "");
    shireRoads.setAttribute("d", path(oxon.roads) || "");
  }

  // Places every name on the settled close-up: Cowley first, clear of the pins and lines, then the supermarket's
  // label, then whichever towns still fit
  function placeNames() {
    const h = projection(HOME);
    closeUpLines(h);
    const r = 11 * k;
    const taken = farmMarks.map(({ xy: [x, y] }) => ({ x0: x - r, x1: x + r, y0: y - r, y1: y + r }));
    homeLabel.setAttribute("transform", `translate(${xy(placeBeside(homeLabel, h, taken))})`);
    const farm = data.farms[trip.farm];
    oursLabel.textContent = farm.name;
    oursLabel.setAttribute("transform", `translate(${xy(placeBeside(oursLabel, farmMarks[trip.farm].xy, taken))})`);

    // the supermarket's name goes out along its last mile in, at the first spot that's clear
    theirsLabel.textContent = `from ${trip.place}`;
    const [ex, ey] = projection(along(pts, pts[pts.length - 1].miles - 1).at);
    const d = Math.hypot(ex - h[0], ey - h[1]) || 1, w = theirsLabel.getComputedTextLength() + 8;
    // just over the line, or just under it, at a few distances out
    const spots = [.5, .62, .4, .72, .3].flatMap((f) => [-12, 26 * k].map((dy) =>
      box(h[0] + ((ex - h[0]) / d) * R * f, h[1] + ((ey - h[1]) / d) * R * f + dy, w, 17 * k * 1.2)));
    const own = lines[lines.length - 1];
    const spot = spots.find((b) => within(b) && !taken.some((t) => overlaps(t, b)) && !lines.some((l) => l !== own && crosses(b, l)))
      || spots.find((b) => within(b) && !taken.some((t) => overlaps(t, b))) || spots.find(within) || spots[0];
    theirsLabel.setAttribute("x", (spot.x0 + spot.x1) / 2); theirsLabel.setAttribute("y", spot.y);
    taken.push(spot);
    for (const p of oxon.places) {
      const [x, y] = projection(p.at);
      const size = (p.kind === "city" ? 21 : 17) * k;
      // a name's width only changes with the lettering size, so it's measured once per size
      if (p.k !== k) { p.label.style.display = ""; p.w = p.label.getComputedTextLength() + 8; p.k = k; }
      const b = box(x, y - 6, p.w, size * 1.2);
      const inside = within(b);
      const fits = inside && clearOf(b, taken);
      p.label.style.display = fits ? "" : "none";
      if (!fits) continue;
      taken.push(b);
      p.label.setAttribute("x", x); p.label.setAttribute("y", y - 6);
    }
  }
  // names in once the view is still, and out before it moves again
  function showNames() {
    if (!oxon) return;
    placeNames();
    svg.classList.add("is-close");
  }
  async function hideNames(id, animate) {
    if (!svg.classList.contains("is-close")) return;
    svg.classList.remove("is-close");
    if (animate) await wait(450, id);
  }
  // the space a drawn label takes up, padded a little; `at` is where its transform moves it to
  const measured = (label, at = [0, 0]) => {
    const b = label.getBBox();
    return { x0: at[0] + b.x - 4, x1: at[0] + b.x + b.width + 4, y0: at[1] + b.y - 2, y1: at[1] + b.y + b.height + 2 };
  };
  const box = (x, y, w, hgt) => ({ x0: x - w / 2, x1: x + w / 2, y0: y - hgt * .8, y1: y + hgt * .3, y });
  // whether a label's box sits wholly inside the globe's outline
  const within = (b) => [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].every(([x, y]) => Math.hypot(x - C[0], y - C[1]) < R - 6);
  const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

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

  // Dive down onto Cowley: the globe turns to face it in the first part of the move while the zoom builds, so
  // it's one continuous movement rather than a turn and then a zoom
  async function zoomIn(id, animate) {
    const from = centre, s0 = scale;
    await tween(animate ? 2500 : 0, (t) => {
      centre = between(from, HOME, part(t, 0, .45));
      scale = s0 * (ZOOM / s0) ** part(t, .08, 1);
    }, id);
    showNames();
  }
  // Rise up from Cowley, turning towards `to` only once most of the way out
  async function zoomOut(to, id) {
    await hideNames(id, true);
    const from = centre, s0 = scale;
    await tween(2100, (t) => {
      scale = s0 * (R / s0) ** part(t, 0, .8);
      centre = between(from, to, part(t, .45, 1));
    }, id);
  }

  // ---------- the panel ----------

  const theirs = document.querySelector("[data-theirs]");
  const how = document.querySelector("[data-theirs-how]");
  const times = document.querySelector("[data-times]");
  const desc = document.querySelector("[data-globe-desc]");

  // ---------- us and them ----------

  // which side of the comparison is showing: "them" (the supermarket's trip), "us" (ours), or neither
  const section = svg.closest(".miles");
  const setSide = (side) => { if (side) section.dataset.side = side; else delete section.dataset.side; };
  const plural = (n) => `${n} ${n === 1 ? "mile" : "miles"}`;
  const oursNum = document.querySelector("[data-ours]");
  const oursHow = document.querySelector("[data-ours-how]");
  const oursUnit = document.querySelector("[data-ours-unit]");
  const captionThem = document.querySelector("[data-caption-them]");
  const captionUs = document.querySelector("[data-caption-us]");
  const farmItems = document.querySelectorAll("[data-farm]");

  // Plays one trip: out from the last close-up (or round the globe), the supermarket's trip, a pause on the whole
  // route, then down to our farms and our own journey in. Resolves with its run id once that's done.
  async function play(index, animate) {
    const id = ++run;
    // the last trip's names go before anything changes
    svg.classList.remove("is-still");
    await hideNames(id, animate);
    trip = data.trips[index];
    pts = trip.pts ??= trace(trip.legs);
    const total = pts[pts.length - 1].miles;
    // the view settles over the middle of the route, so both ends show; it starts a little towards the origin
    const mid = routeMid();
    const start = between(mid, pts[0].at, .2);
    const farm = data.farms[trip.farm];

    how.textContent = `by ${trip.by} from ${trip.from}`;
    oursHow.textContent = `from ${farm.name}, as the crow flies`;
    oursUnit.textContent = trip.near === 1 ? "mile" : "miles";
    captionThem.textContent = trip.them;
    captionUs.textContent = trip.us;
    farmItems.forEach((li) => li.classList.toggle("is-from", +li.dataset.farm === trip.farm));
    farmMarks.forEach(({ pin }, i) => pin.classList.toggle("is-from", i === trip.farm));
    times.textContent = "";
    desc.textContent = `A globe showing the route a supermarket's ${trip.produce.toLowerCase()} takes from ${trip.from} to Oxford, ${fmt(trip.miles)} miles, then zooming in on Oxford to show ours coming ${plural(trip.near)} from ${farm.name}.`;
    const settle = () => {
      theirs.textContent = fmt(trip.miles);
      oursNum.textContent = trip.near;
      times.textContent = `That's about ${fmt(trip.times)} times further.`;
    };

    if (!animate) {
      scale = R; centre = mid; miles = total; local = 1;
      draw();
      settle();
      setSide(null);
      svg.classList.add("is-still");
      return id;
    }

    miles = 0; local = 0;
    theirs.textContent = oursNum.textContent = "0";
    setSide("them");
    if (scale > R * 1.5) await zoomOut(start, id);
    else {
      const from = centre;
      await tween(400 + angle(from, start) / RAD * 8, (t) => { centre = between(from, start, ease(t)); }, id);
    }
    // the trip, with the globe drifting to keep it in view; short trips go quicker
    await tween(1500 + 1700 * Math.min(1, trip.miles / 6000), (t) => {
      centre = between(start, mid, ease(t));
      miles = total * ease(t);
      theirs.textContent = fmt(trip.miles * ease(t));
    }, id);
    // a pause on the whole route with its origin named, then go and find ours
    svg.classList.add("is-still");
    await wait(1400, id);
    svg.classList.remove("is-still");
    setSide("us");
    await wait(250, id);
    await zoomIn(id, true);
    // ours comes in from its farm
    await wait(300, id);
    await tween(1200 + 60 * trip.near, (t) => {
      local = ease(t);
      oursNum.textContent = Math.round(trip.near * ease(t));
    }, id);
    settle();
    return id;
  }

  const inputs = [...document.querySelectorAll(".miles__pick input")];
  const picked = () => Math.max(0, inputs.findIndex((i) => i.checked));

  // Once the globe is in view it plays each vegetable in turn, resting on the close-up, until someone picks one.
  // It pauses while scrolled away and carries on from the same vegetable on coming back.
  let cycling = !reduce, inView = false;
  async function cycle() {
    while (cycling && inView) {
      const id = await play(picked(), true);
      await wait(3500, id);
      if (!cycling || !inView) return;
      const next = inputs[(picked() + 1) % inputs.length];
      next.checked = true;
      // keep the picked pebble in sight on phones, where the row scrolls sideways
      const row = next.closest("fieldset"), label = next.closest("label");
      row.scrollTo({ left: label.offsetLeft - (row.clientWidth - label.offsetWidth) / 2, behavior: "smooth" });
    }
  }

  inputs.forEach((input) => {
    input.addEventListener("change", () => {
      cycling = false;
      land$.then(() => play(picked(), !reduce));
    });
  });

  land$.then((rings) => {
    earth = { type: "MultiPolygon", coordinates: rings.map((r) => [[...r, r[0]]]) };
    play(picked(), false);
    if (reduce) return;
    // the globe starts turned away a little, so the first trip swings into view
    centre = [centre[0] + 70, centre[1] - 10];
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView && cycling) cycle();
      else if (!inView && cycling) run++;
    }, { threshold: .45 }).observe(svg);
  });

  // the labels and pins stay a readable size as the globe shrinks on small screens
  new ResizeObserver(() => {
    k = clamp(640 / (svg.clientWidth || 640), 1, 1.6);
    svg.style.setProperty("--k", k);
    if (trip) draw();
    if (svg.classList.contains("is-close")) placeNames();
  }).observe(svg);
})();
