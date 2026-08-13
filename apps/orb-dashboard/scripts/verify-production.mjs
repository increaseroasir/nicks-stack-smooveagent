import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PUBLIC = join(ROOT, "public");

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

const production = JSON.parse(
  await readFile(
    join(ROOT, "recovery", "production-assets-manifest.json"),
    "utf8",
  ),
);
const metadata = JSON.parse(
  await readFile(join(ROOT, "recovery", "production-metadata.json"), "utf8"),
);

const expectedRoutes = new Set(production.map((entry) => entry.route));
const actualRoutes = new Set();
const failures = [];

for (const file of await walk(PUBLIC)) {
  const relativePath = relative(PUBLIC, file).split(sep).join("/");
  actualRoutes.add(relativePath === "index.html" ? "/" : `/${relativePath}`);
}

for (const entry of production) {
  const file =
    entry.route === "/"
      ? join(PUBLIC, "index.html")
      : join(PUBLIC, entry.route.replace(/^\//, ""));
  let bytes;
  try {
    bytes = await readFile(file);
  } catch {
    failures.push(`${entry.route}: missing ${relative(ROOT, file)}`);
    continue;
  }
  const digest = sha256(bytes);
  if (bytes.length !== entry.bytes || digest !== entry.sha256) {
    failures.push(
      `${entry.route}: expected ${entry.bytes}/${entry.sha256}, got ${bytes.length}/${digest}`,
    );
  }
}

for (const route of actualRoutes) {
  if (!expectedRoutes.has(route)) failures.push(`${route}: unexpected asset`);
}
for (const route of expectedRoutes) {
  if (!actualRoutes.has(route)) failures.push(`${route}: absent from recovered tree`);
}

const exactWorker = await readFile(
  join(ROOT, "recovery", "production-active-worker.js"),
);
const exactWorkerHash = sha256(exactWorker);
if (exactWorkerHash !== metadata.exact_worker_sha256) {
  failures.push(
    `recovery/production-active-worker.js: expected ${metadata.exact_worker_sha256}, got ${exactWorkerHash}`,
  );
}

const template = await readFile(join(ROOT, "src", "worker-template.js"), "utf8");
for (const forbiddenHandler of [
  'url.pathname.startsWith("/api/")',
  'url.pathname === "/chat"',
  'request.headers.get("upgrade")',
]) {
  if (template.includes(forbiddenHandler)) {
    failures.push(
      `src/worker-template.js unexpectedly handles ${forbiddenHandler}`,
    );
  }
}

if (failures.length) {
  console.error("Production parity verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Verified ${production.length} recovered assets and active Worker integrity.`,
);
console.log(`exact_worker_sha256=${exactWorkerHash}`);
