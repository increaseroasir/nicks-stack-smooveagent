import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PUBLIC = join(ROOT, "public");
const DIST = join(ROOT, "dist");
const TEMPLATE = join(ROOT, "src", "worker-template.js");

const fallbackMime = {
  ".css": "text/css; charset=UTF-8",
  ".html": "text/html; charset=UTF-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=UTF-8",
  ".json": "application/json",
  ".png": "image/png",
};

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.isFile() && entry.name !== ".assetsignore") files.push(path);
  }
  return files;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const template = await readFile(TEMPLATE, "utf8");
if (template.includes("__ASSET_MAP__") || template.includes("atob(")) {
  throw new Error("Worker template still embeds or decodes assets");
}

const manifest = [];
for (const file of await walk(PUBLIC)) {
  const relativePath = relative(PUBLIC, file).split(sep).join("/");
  const route = relativePath === "index.html" ? "/" : `/${relativePath}`;
  const payload = await readFile(file);
  manifest.push({
    route,
    path: `public/${relativePath}`,
    mime: fallbackMime[extname(file).toLowerCase()] || "application/octet-stream",
    bytes: payload.length,
    sha256: sha256(payload),
  });
}

await mkdir(DIST, { recursive: true });
await writeFile(join(DIST, "worker.js"), template);
await writeFile(
  join(DIST, "assets-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await writeFile(
  join(DIST, "BUILD.txt"),
  `worker_sha256=${sha256(Buffer.from(template))}\nassets=${manifest.length}\nmode=cloudflare-static-assets\n`,
);

console.log(`Built static-asset Worker (${manifest.length} files, not embedded)`);
console.log(`worker_sha256=${sha256(Buffer.from(template))}`);
