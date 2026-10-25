// Cloudflare Workers entry point. `wrangler.jsonc` uploads `dist/` as static
// assets and runs this Worker first on every request, so routing matches
// `main.ts`; files are read through the ASSETS binding.
import { BUILD_ASSETS, createHandler } from "./platform/app.tsx";

import { roomRequest } from "./multiplayer/rooms.ts";
import type { RoomNamespace } from "./multiplayer/cloudflare.ts";
export { GameRoom } from "./multiplayer/rooms.ts";

interface Env {
  ROOMS?: RoomNamespace;
  ASSETS: { fetch(input: Request | string): Promise<Response> };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const room = await roomRequest(req, env.ROOMS);
    if (room) return room;
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
    }, BUILD_ASSETS);
    return handler(req);
  },
};
