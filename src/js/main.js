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

function renderStatus(el) {
  const { day, opens, closes } = el.dataset;
  const target = DAYS.indexOf(day);
  const now = londonNow();
  const open = toMinutes(opens), close = toMinutes(closes);

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

// Show the name beside the nav logo once the hero's big one is out of view
const heroLogo = document.querySelector(".logo--hero");
if (heroLogo && "IntersectionObserver" in window) {
  new IntersectionObserver(([e]) => document.body.classList.toggle("scrolled", !e.isIntersecting), { rootMargin: "-64px 0px 0px" }).observe(heroLogo);
} else {
  document.body.classList.add("scrolled");
}

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

// "What do I do with this?": tap a vegetable in the strip to open its card
const recipeDialog = document.getElementById("recipe-dialog");
const recipes = JSON.parse(document.getElementById("recipes")?.textContent || "[]");

document.querySelectorAll("[data-recipe]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const r = recipes[btn.dataset.recipe];
    if (!r || !recipeDialog) return;
    recipeDialog.querySelector("[data-recipe-photo]").src = `/images/${r.img}-600.jpg`;
    recipeDialog.querySelector("[data-recipe-title]").textContent = r.label;
    recipeDialog.querySelector("[data-recipe-meal]").textContent = r.meal;
    recipeDialog.querySelector("[data-recipe-keep]").textContent = r.keep;
    recipeDialog.querySelector("[data-recipe-eat]").textContent = r.eat;
    recipeDialog.showModal();
  });
});

recipeDialog?.addEventListener("click", (e) => { if (e.target === recipeDialog) recipeDialog.close(); });

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
