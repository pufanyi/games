// Cloudflare Workers entry point. `wrangler.jsonc` uploads `static/` and
// `games/` as static assets and runs this Worker first on every request, so
// routing matches `main.ts`; files are read through the ASSETS binding.
import { createHandler } from "./app.ts";

interface Env {
  ASSETS: { fetch(input: Request | string): Promise<Response> };
}

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    const handler = createHandler({
      async hasIndex(slug) {
        // Assets serve `games/<slug>/index.html` at the trailing-slash URL.
        const res = await env.ASSETS.fetch(
          new URL(`/games/${slug}/`, req.url).href,
        );
        await res.body?.cancel();
        return res.ok;
      },
      serve: (req) => env.ASSETS.fetch(req),
    });
    return handler(req);
  },
};
