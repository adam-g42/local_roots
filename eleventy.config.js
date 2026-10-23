// "15:00" -> "3pm", "10:30" -> "10:30am"
function time12(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy({ "src/css": "css", "src/js": "js" });
  eleventyConfig.addPassthroughCopy("src/admin/config.yml");

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

  return {
    dir: { input: "src", output: "_site" },
    htmlTemplateEngine: "njk",
  };
}
