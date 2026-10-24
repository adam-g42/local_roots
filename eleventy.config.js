import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

// "15:00" -> "3pm", "10:30" -> "10:30am"
function time12(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

export default function (eleventyConfig) {
  // Photos are added as one full-size file each (by hand or through the editor). Every <img> pointing at one is turned
  // into a <picture> with phone and desktop sizes, in WebP and JPEG, written to /img/. The originals are still copied to
  // /images/ for the editor's thumbnails, and for logos and icons, which are used as they are.
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["webp", "jpeg"],
    widths: [450, 900],
    sharpJpegOptions: { quality: 75, mozjpeg: true },
    sharpWebpOptions: { quality: 72 },
    htmlOptions: { imgAttributes: { loading: "lazy", decoding: "async" } },
  });
  eleventyConfig.addPassthroughCopy({ "src/images": "images" });
  eleventyConfig.addPassthroughCopy({ "src/css": "css", "src/js": "js" });
  eleventyConfig.addPassthroughCopy("src/admin/config.yml");
  eleventyConfig.addPassthroughCopy("src/_headers");
  // d3-geo draws the food-miles globe
  eleventyConfig.addPassthroughCopy({
    "node_modules/d3-array/dist/d3-array.min.js": "js/vendor/d3-array.min.js",
    "node_modules/d3-geo/dist/d3-geo.min.js": "js/vendor/d3-geo.min.js",
  });

  eleventyConfig.addFilter("time12", time12);
  eleventyConfig.addFilter("urlencode", (s) => encodeURIComponent(s ?? ""));
  eleventyConfig.addFilter("handle", (s) => String(s ?? "").replace(/^@/, ""));
  // "10:00" -> "100000" for iCalendar DTSTART
  eleventyConfig.addFilter("icsTime", (hhmm) => hhmm.replace(":", "") + "00");
  // next date (UTC, YYYYMMDD) falling on the given weekday name
  eleventyConfig.addFilter("nextDate", (dayName) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + ((days.indexOf(dayName) - d.getUTCDay() + 7) % 7));
    return d.toISOString().slice(0, 10).replaceAll("-", "");
  });
  eleventyConfig.addFilter("icsEscape", (s) => String(s).replace(/([,;\\])/g, "\\$1"));
  eleventyConfig.addFilter("byDay", (dayName) => dayName.slice(0, 2).toUpperCase());
  eleventyConfig.addFilter("unique", (list) => [...new Set(list)]);
  eleventyConfig.addFilter("year", () => new Date().getFullYear());
  // true once a "YYYY-MM-DD" day is over, in UK time
  eleventyConfig.addFilter("isPast", (ymd) => !!ymd && String(ymd).slice(0, 10) < new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" }));
  eleventyConfig.addFilter("commas", (n) => Number(n).toLocaleString("en-GB"));
  // editor text -> HTML: a blank line starts a new paragraph, a single line break stays one, *words* go bold
  eleventyConfig.addFilter("paras", (s) => {
    const escape = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return String(s ?? "").trim().split(/\n\s*\n/).map((para) =>
      `<p>${escape(para.trim()).replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>")}</p>`
    ).join("\n");
  });

  return {
    dir: { input: "src", output: "_site" },
    htmlTemplateEngine: "njk",
  };
}
