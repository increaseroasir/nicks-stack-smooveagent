import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = resolve(import.meta.dirname, "..");
const PUBLIC = join(ROOT, "public");
const DIST = join(ROOT, "dist");
const TEMPLATE = join(ROOT, "src", "worker-template.js");
const PRODUCTION_MANIFEST = join(
  ROOT,
  "recovery",
  "production-assets-manifest.json",
);

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
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const productionManifest = JSON.parse(
  await readFile(PRODUCTION_MANIFEST, "utf8"),
);
const productionMimeByRoute = new Map(
  productionManifest.map((entry) => [entry.route, entry.mime]),
);

const assets = {};
const manifest = [];
for (const file of await walk(PUBLIC)) {
  const relativePath = relative(PUBLIC, file).split(sep).join("/");
  const route = relativePath === "index.html" ? "/" : `/${relativePath}`;
  const payload = await readFile(file);
  const mime =
    productionMimeByRoute.get(route) ||
    fallbackMime[extname(file).toLowerCase()] ||
    "application/octet-stream";
  const compressed = gzipSync(payload, { level: 9, mtime: 0 });

  assets[route] = {
    data: compressed.toString("base64"),
    mime,
  };
  manifest.push({
    route,
    path: `public/${relativePath}`,
    mime,
    bytes: payload.length,
    sha256: sha256(payload),
  });
}

const template = await readFile(TEMPLATE, "utf8");
if (!template.includes("__ASSET_MAP__")) {
  throw new Error("Worker template is missing __ASSET_MAP__ placeholder");
}
const worker = template.replace("__ASSET_MAP__", JSON.stringify(assets));

await mkdir(DIST, { recursive: true });
await writeFile(join(DIST, "worker.js"), worker);
await writeFile(
  join(DIST, "assets-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await writeFile(
  join(DIST, "BUILD.txt"),
  `worker_sha256=${sha256(Buffer.from(worker))}\nassets=${manifest.length}\n`,
);

console.log(`Built ${manifest.length} assets into dist/worker.js`);
console.log(`worker_sha256=${sha256(Buffer.from(worker))}`);
