// The editor's "Login with GitHub", step 2: GitHub sends the popup back here with a code, we swap it for a login token,
// and hand the token to the editor window the way Decap expects ("authorizing:github", then "authorization:github:…").

export async function callback(request, env) {
  const url = new URL(request.url);
  const state = /(?:^|;\s*)oauth_state=([^;]+)/.exec(request.headers.get("Cookie") || "")?.[1];
  if (!state || state !== url.searchParams.get("state")) return reply("error", { message: "The login took too long. Close this window and try again." });

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "local-roots-editor" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: url.searchParams.get("code"),
      redirect_uri: `${url.origin}/api/callback`,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) return reply("error", { message: data.error_description || "GitHub didn't log you in. Close this window and try again." });
  return reply("success", { token: data.access_token, provider: "github" });
}

function reply(status, content) {
  // escaped so nothing in the message can close the <script>
  const message = JSON.stringify(`authorization:github:${status}:${JSON.stringify(content)}`).replace(/</g, "\\u003c");
  const html = `<!doctype html><meta charset="utf-8"><title>Logging in…</title>
<p style="font: 1rem system-ui, sans-serif">${status === "success" ? "Logging you in…" : "Login didn't work. Close this window and try again."}</p>
<script>
  // the editor answers "authorizing:github" once it's listening; only then send the result, and only to this site
  window.addEventListener("message", (e) => {
    if (e.origin === location.origin) window.opener.postMessage(${message}, location.origin);
  }, { once: true });
  window.opener?.postMessage("authorizing:github", location.origin);
</script>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Set-Cookie": "oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    },
  });
}
