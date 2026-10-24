// Open-now / next-open line, the share button and the recipe cards. Everything else is plain HTML.

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function time12(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const hour = h % 12 || 12;
  return (m ? `${hour}:${String(m).padStart(2, "0")}` : `${hour}`) + (h >= 12 ? "pm" : "am");
}

// The stall runs on UK time whatever the visitor's clock says
function londonNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London", weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  return { day: DAYS.indexOf(parts.weekday), minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

// today in London as YYYY-MM-DD
const londonToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

function renderStatus(el) {
  const { day, opens, closes, nextOpen } = el.dataset;
  const target = DAYS.indexOf(day);
  const now = londonNow();
  const open = toMinutes(opens), close = toMinutes(closes);

  // not open yet, or on a break: the next open day is the one set in the editor, not the coming week's
  if (nextOpen && nextOpen > londonToday()) {
    const daysAway = Math.round((Date.parse(nextOpen) - Date.parse(londonToday())) / 86400000);
    const date = new Date(nextOpen).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
    el.textContent = daysAway === 1 ? `Next open tomorrow, ${time12(opens)}` : `Next open ${date}`;
    return;
  }

  if (now.day === target && now.minutes >= open && now.minutes < close) {
    el.textContent = `Open now until ${time12(closes)}`;
    el.dataset.open = "";
    return;
  }
  if (now.day === target && now.minutes < open) {
    el.textContent = `Open today from ${time12(opens)}`;
    return;
  }
  const daysAway = (target - now.day + 7) % 7 || 7;
  const next = new Date(Date.now() + daysAway * 86400000);
  const date = next.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Europe/London" });
  el.textContent = daysAway === 1 ? `Next open tomorrow, ${time12(opens)}` : `Next open ${day} ${date}`;
}

document.querySelectorAll("[data-status]").forEach(renderStatus);

// The site only rebuilds when something's published, so a notice past its "until" day also takes itself down here
const notice = document.querySelector(".notice[data-until]");
if (notice && notice.dataset.until < londonToday()) notice.remove();

// The header starts tall and settles to a slim bar once the page is scrolled
const setScrolled = () => document.body.classList.toggle("scrolled", scrollY > 16);
addEventListener("scroll", setScrolled, { passive: true });
setScrolled();

// Phone menu: close it once a link or Share is picked
const menu = document.getElementById("nav-menu");
menu?.querySelectorAll("a, button").forEach((el) => el.addEventListener("click", () => menu.hidePopover()));

// Share: the phone's own share sheet where there is one, otherwise our dialog
const dialog = document.getElementById("share-dialog");

document.querySelectorAll("[data-share]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const data = { title: document.title, text: document.querySelector('meta[name="description"]')?.content, url: location.origin + "/" };
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share(data); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    dialog?.showModal();
  });
});

dialog?.querySelector("[data-copy]")?.addEventListener("click", async (e) => {
  const done = dialog.querySelector("[data-copied]");
  try {
    await navigator.clipboard.writeText(e.currentTarget.dataset.copy);
    done.textContent = "Link copied";
  } catch {
    done.textContent = `Copy this link: ${e.currentTarget.dataset.copy}`;
  }
  done.hidden = false;
});

dialog?.addEventListener("close", () => { dialog.querySelector("[data-copied]").hidden = true; });
dialog?.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });

// The veg strip drifts on its own but is a real scroller underneath: swipe it, trackpad it or drag it with the mouse.
// It eases to a stop while someone's using it and picks up again a moment after they let go.
const strip = document.querySelector(".strip");
if (strip && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const SECONDS_PER_LOOP = 70;
  const IDLE_MS = 2500;
  let loop = 0, pos = 0, lastSet = -1, speed = 0, lastFrame = 0;
  let hovering = false, focused = false, touching = false, dragging = null, lastTouched = -Infinity, visible = true;

  // the list is printed twice, so a position and the same position one copy along look identical;
  // keep it in a window with spare room either side, so there's always somewhere to scroll back to
  const measure = () => { loop = strip.querySelector(".strip__track").scrollWidth / 2; };
  const normalise = () => {
    const from = Math.max(0, (loop - strip.clientWidth) / 2);
    while (pos < from) pos += loop;
    while (pos >= from + loop) pos -= loop;
  };
  const touched = () => { lastTouched = performance.now(); };

  function frame(now) {
    const dt = Math.min(now - lastFrame, 100) / 1000;
    lastFrame = now;
    // anything that moved it since our last frame was the visitor (a swipe still gliding, a trackpad, a scrollbar)
    if (lastSet >= 0 && Math.abs(strip.scrollLeft - lastSet) > 2) { pos = strip.scrollLeft; touched(); }
    const busy = hovering || focused || touching || dragging || now - lastTouched < IDLE_MS;
    speed += ((busy ? 0 : loop / SECONDS_PER_LOOP) - speed) * Math.min(1, dt * 3);
    if (!busy) normalise();
    pos += speed * dt;
    strip.scrollLeft = pos;
    lastSet = strip.scrollLeft;
    if (visible) requestAnimationFrame(frame);
  }
  const start = () => { lastFrame = performance.now(); requestAnimationFrame(frame); };

  measure();
  normalise();
  addEventListener("resize", measure);
  new IntersectionObserver(([e]) => { const was = visible; visible = e.isIntersecting; if (visible && !was) start(); }).observe(strip);
  start();

  strip.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hovering = true; });
  strip.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hovering = false; });
  // hold still for someone tabbing through, but not for the focus a closed recipe card hands back
  strip.addEventListener("keyup", (e) => { if (e.key === "Tab") focused = true; });
  strip.addEventListener("focusout", () => { focused = false; touched(); });
  strip.addEventListener("touchstart", () => { touching = true; }, { passive: true });
  strip.addEventListener("touchend", () => { touching = false; touched(); });
  strip.addEventListener("touchcancel", () => { touching = false; touched(); });

  // mouse drag; a drag that ends over a vegetable mustn't also open its card
  let dragged = false;
  strip.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    dragging = { x: e.clientX, from: strip.scrollLeft };
    dragged = false;
  });
  strip.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragging.x;
    if (!dragged && Math.abs(dx) > 5) {
      dragged = true;
      strip.classList.add("is-dragging");
      strip.setPointerCapture(e.pointerId);
    }
    if (dragged) { pos = dragging.from - dx; strip.scrollLeft = pos; lastSet = strip.scrollLeft; }
  });
  const endDrag = () => { dragging = null; strip.classList.remove("is-dragging"); touched(); };
  strip.addEventListener("pointerup", endDrag);
  strip.addEventListener("pointercancel", endDrag);
  strip.addEventListener("click", (e) => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
}

// "What do I do with this?": tap a vegetable in the strip to open its card
const recipeDialog = document.getElementById("recipe-dialog");
const recipes = JSON.parse(document.getElementById("recipes")?.textContent || "[]");
const recipeSaved = recipeDialog?.querySelector("[data-recipe-saved]");
let openRecipe;

document.querySelectorAll("[data-recipe]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const r = recipes[btn.dataset.recipe];
    if (!r || !recipeDialog) return;
    openRecipe = r;
    recipeSaved.hidden = true;
    // the same photo the strip has already loaded, in whichever size and format the browser picked
    const photo = btn.querySelector("img");
    recipeDialog.querySelector("[data-recipe-photo]").src = photo.currentSrc || photo.src;
    recipeDialog.querySelector("[data-recipe-title]").textContent = r.label;
    recipeDialog.querySelector("[data-recipe-meal]").textContent = r.meal;
    recipeDialog.querySelector("[data-recipe-keep]").textContent = r.keep;
    recipeDialog.querySelector("[data-recipe-eat]").textContent = r.eat;
    recipeDialog.showModal();
  });
});

recipeDialog?.addEventListener("click", (e) => { if (e.target === recipeDialog) recipeDialog.close(); });

// Save: the recipe as plain text, into the phone's share sheet (Notes, WhatsApp…) or copied on a computer
recipeDialog?.querySelector("[data-recipe-save]")?.addEventListener("click", async () => {
  const r = openRecipe;
  const text = `${r.label}\n\nTry this: ${r.meal}\n\nKeeping it: ${r.keep}\n\nWhat you can eat: ${r.eat}\n\nLocal Roots, ${location.origin}/`;
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try { await navigator.share({ title: r.label, text }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  try {
    await navigator.clipboard.writeText(text);
    recipeSaved.textContent = "Copied";
  } catch {
    recipeSaved.textContent = "Couldn't copy, try a screenshot";
  }
  recipeSaved.hidden = false;
});

// Font preview: /?font=3 tries pairing 3 from _data/fonts.json across the page
const fontParam = Number(new URLSearchParams(location.search).get("font"));
const fontOptions = JSON.parse(document.getElementById("font-options")?.textContent || "[]");
const preview = fontOptions[fontParam - 1];
if (preview) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${preview.gfHead}${preview.gfAccent ? `&family=${preview.gfAccent}` : ""}&family=${preview.gfBody}&display=swap`;
  document.head.append(link);
  const root = document.documentElement.style;
  root.setProperty("--serif", `"${preview.head}", Georgia, serif`);
  root.setProperty("--sans", `"${preview.body}", ui-rounded, sans-serif`);
  root.setProperty("--accent", `"${preview.accent}", cursive`);
  root.setProperty("--head-weight", preview.headWeight);
  root.setProperty("--head-scale", preview.headScale);
  root.setProperty("--accent-style", preview.accentStyle);
  root.setProperty("--accent-weight", preview.accentWeight);
  root.setProperty("--accent-scale", preview.accentScale);

  const prev = fontParam === 1 ? fontOptions.length : fontParam - 1;
  const next = fontParam === fontOptions.length ? 1 : fontParam + 1;
  const bar = document.createElement("div");
  bar.className = "font-preview";
  bar.innerHTML = `<span>Previewing ${fontParam}: ${preview.name} (${preview.head}${preview.accent !== preview.head ? ` + ${preview.accent}` : ""})</span>
    <nav aria-label="Other fonts"><a href="/?font=${prev}" aria-label="Previous font">‹</a><a href="/?font=${next}" aria-label="Next font">›</a></nav>
    <a href="/fonts/">All fonts</a>`;
  document.body.append(bar);
}
