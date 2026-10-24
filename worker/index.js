// Cloudflare serves the built site (_site) itself; only /api/* reaches this script (see wrangler.jsonc).
import { auth } from "./auth.js";
import { callback } from "./callback.js";
import { form } from "./form.js";

const routes = {
  "POST /api/form": form,
  "GET /api/auth": auth,
  "GET /api/callback": callback,
};

export default {
  fetch(request, env) {
    const route = routes[`${request.method} ${new URL(request.url).pathname}`];
    return route ? route(request, env) : env.ASSETS.fetch(request);
  },
};
