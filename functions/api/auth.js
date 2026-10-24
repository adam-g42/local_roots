// The editor's "Login with GitHub", step 1: Decap opens a popup here, and we send it on to GitHub.
// Step 2 is callback.js. Set in Cloudflare: GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET, from the GitHub OAuth app.

export function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") === "repo" ? "repo" : "public_repo";
  // a one-off code GitHub hands back, so the callback only accepts logins that started here
  const state = crypto.randomUUID();
  const github = new URL("https://github.com/login/oauth/authorize");
  github.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: `${url.origin}/api/callback`, scope, state });
  return new Response(null, {
    status: 302,
    headers: { Location: github.href, "Set-Cookie": `oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600` },
  });
}
