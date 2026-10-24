// The volunteer and contact forms post here. Each one is emailed through Resend, then the sender lands on /thanks/.
// Set in Cloudflare: RESEND_API_KEY, FORM_TO (where submissions go; commas for more than one) and
// FORM_FROM (a sender on the verified domain, e.g. "Local Roots <forms@localrootsoxford.co.uk>").

const FIELDS = { name: "Name", email: "Email", topic: "About", help: "Can help with", message: "Message" };

export async function form(request, env) {
  const form = await request.formData();
  const thanks = Response.redirect(new URL("/thanks/", request.url), 303);

  // the hidden "Leave this empty" field: people never see it, spam bots fill it in
  if (form.get("bot-field")) return thanks;

  const volunteer = form.get("form-name") === "volunteer";
  const name = String(form.get("name") || "").replace(/\s+/g, " ").trim();
  const email = String(form.get("email") || "").trim();
  const lines = Object.entries(FIELDS).flatMap(([key, label]) => {
    const values = form.getAll(key).map((v) => String(v).trim()).filter(Boolean);
    if (!values.length) return [];
    return key === "message" ? [`\n${label}:\n${values.join("\n")}`] : [`${label}: ${values.join(", ")}`];
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.FORM_FROM,
      to: String(env.FORM_TO).split(",").map((s) => s.trim()),
      reply_to: email || undefined,
      subject: `${volunteer ? "Volunteer offer" : "Message"} from ${name || "the website"}`,
      text: lines.join("\n"),
    }),
  });
  if (res.ok) return thanks;

  console.error("Resend failed", res.status, await res.text());
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Not sent · Local Roots</title>
<p style="font: 1.1rem/1.5 system-ui, sans-serif; max-width: 30rem; margin: 3rem auto; padding: 0 1rem">Sorry, your message didn't send. Please <a href="javascript:history.back()">go back</a> and try again in a minute.</p>`,
    { status: 502, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
