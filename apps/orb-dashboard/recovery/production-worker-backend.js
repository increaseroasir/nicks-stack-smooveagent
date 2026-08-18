async function unpack(encoded) {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
}
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const assetPath = url.pathname === "/" ? "/" : url.pathname.startsWith("/ui/") ? url.pathname : null;
    if (!assetPath) return new Response("Not found", { status: 404 });
    const asset = ASSETS[assetPath];
    if (!asset) return new Response("Not found", { status: 404 });
    const body = await unpack(asset.data);
    return new Response(body, { headers: {
      "content-type": asset.mime,
      "cache-control": assetPath === "/" ? "no-store" : "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    }});
  },
};