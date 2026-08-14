// Lil Smoove voice-dashboard static shell.
//
// Only `/` and `/ui/*` are served from the Cloudflare assets pipeline.
// Every Hermes endpoint—including `/api/*`, `/chat`, and WebSocket
// upgrades—must continue to the Orgo tunnel and must never be handled here.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const assetPath =
      url.pathname === "/"
        ? "/index.html"
        : url.pathname.startsWith("/ui/")
          ? url.pathname
          : null;

    if (!assetPath) return new Response("Not found", { status: 404 });

    return env.ASSETS.fetch(new URL(assetPath, request.url));
  },
};
