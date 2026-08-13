import { createHash } from "node:crypto";
import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");
const PUBLIC = join(ROOT, "public");
const PATCH_DIR = join(ROOT, "patches");
const SOURCE = join(ROOT, "recovery", "operator-source", "index-DrSg8VbT.js");
const ASSETS = join(PUBLIC, "ui", "assets");
const INDEX_HTML = join(PUBLIC, "index.html");
const MANIFEST = join(ROOT, "recovery", "production-assets-manifest.json");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

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

const fallbackMime = {
  ".css": "text/css; charset=UTF-8",
  ".html": "text/html; charset=UTF-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=UTF-8",
  ".json": "application/json",
  ".png": "image/png",
};

const source = await readFile(SOURCE, "utf8");
const patchFiles = (await readdir(PATCH_DIR))
  .filter((name) => name.endsWith(".mjs"))
  .sort();

if (!patchFiles.length) {
  throw new Error("No operator patches found in apps/orb-dashboard/patches");
}

let next = source;
for (const name of patchFiles) {
  const module = await import(pathToFileURL(join(PATCH_DIR, name)).href);
  const id = module.id ?? name;
  const oldString = module.oldString;
  const newString = module.newString;
  if (typeof oldString !== "string" || typeof newString !== "string") {
    throw new Error(`${id}: patch must export oldString and newString`);
  }
  const hits = next.split(oldString).length - 1;
  if (hits !== 1) {
    throw new Error(`${id}: oldString must match exactly once, found ${hits}`);
  }
  next = next.replace(oldString, newString);
  const remaining = next.split(oldString).length - 1;
  if (remaining > 1 || (remaining === 1 && !newString.includes(oldString))) {
    throw new Error(`${id}: oldString is still present after apply`);
  }
  console.log(`applied ${id}`);
}

const digest = sha256(Buffer.from(next));
const fileName = `index-${digest.slice(0, 8)}.js`;
const outputPath = join(ASSETS, fileName);
const publicUrl = `/ui/assets/${fileName}`;

for (const name of await readdir(ASSETS)) {
  if (/^index-[A-Za-z0-9_-]+\.js$/.test(name) && name !== fileName) {
    await unlink(join(ASSETS, name));
  }
}

await writeFile(outputPath, next);

let html = await readFile(INDEX_HTML, "utf8");
const htmlNext = html.replace(
  /src="\/ui\/assets\/index-[A-Za-z0-9_-]+\.js"/,
  `src="${publicUrl}"`,
);
if (!htmlNext.includes(publicUrl)) {
  throw new Error("index.html does not reference the patched asset");
}
await writeFile(INDEX_HTML, htmlNext);

const previous = JSON.parse(await readFile(MANIFEST, "utf8"));
const mimeByRoute = new Map(previous.map((entry) => [entry.route, entry.mime]));
const manifest = [];
for (const file of await walk(PUBLIC)) {
  const relativePath = relative(PUBLIC, file).split(sep).join("/");
  const route = relativePath === "index.html" ? "/" : `/${relativePath}`;
  const payload = await readFile(file);
  manifest.push({
    route,
    path: `public/${relativePath}`,
    mime:
      mimeByRoute.get(route) ||
      fallbackMime[relativePath.slice(relativePath.lastIndexOf("."))] ||
      "application/octet-stream",
    bytes: payload.length,
    sha256: sha256(payload),
  });
}
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`patched asset ${publicUrl}`);
console.log(`asset_sha256=${digest}`);
console.log(`wrote ${manifest.length} intended public routes`);
