import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");
const PUBLIC = join(ROOT, "public");
const DIST_WORKER = join(ROOT, "dist", "worker.js");

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
  if (!actualRoutes.has(route)) failures.push(`${route}: absent from intended tree`);
}

const html = await readFile(join(PUBLIC, "index.html"), "utf8");
const assetMatch = html.match(/src="(\/ui\/assets\/index-[A-Za-z0-9_-]+\.js)"/);
if (!assetMatch) {
  failures.push("public/index.html does not reference a hashed dashboard asset");
} else {
  const bundle = await readFile(join(PUBLIC, assetMatch[1].replace(/^\//, "")), "utf8");
  const forbidden = [
    'onClick:()=>s(r==="approval"?"idle":"approval")',
    'r==="offline"?"CHECKING SESSION":"VERIFIED"',
    'children:"ELEVENLABS READY"',
    'r==="working"?"Hermes tool"',
    "if(!q||L.current||U.current)return",
    "we.current=null,I.current=null,X(null),f(\"offline\"),s(\"offline\"),j(`Reconnecting private gateway",
  ];
  const required = [
    "Decide in Hermes admin — separate console",
    "OPEN HERMES ADMIN (SEPARATE CONSOLE)",
    "New Hermes session — previous transcript is local only",
    "AbortSignal.timeout",
    "we.current!==be",
    "ELEVENLABS UNKNOWN",
    "ELEVENLABS DOWN",
    'pe||"APPROVAL WAITING"',
    "Tf.current",
    "disabled:!E.trim()||!H",
    'children:fe},void 0,!1,{fileName:"/home/ubuntu/lil-smoove-orb-dashboard/client/src/pages/Home.tsx",lineNumber:768',
    "Private gateway retries exhausted",
  ];
  for (const needle of forbidden) {
    if (bundle.includes(needle)) {
      failures.push(`patched bundle still contains forbidden ${JSON.stringify(needle)}`);
    }
  }
  for (const needle of required) {
    if (!bundle.includes(needle)) {
      failures.push(`patched bundle missing ${JSON.stringify(needle)}`);
    }
  }
}

let worker;
try {
  worker = await readFile(DIST_WORKER);
} catch {
  failures.push("dist/worker.js missing; run build before verify:production");
}

if (worker) {
  const workerHash = sha256(worker);
  const workerModule = await import(pathToFileURL(DIST_WORKER).href);
  const fetchWorker = (path, init) =>
    workerModule.default.fetch(
      new Request(`https://lil-smoove-orb.test${path}`, init),
    );

  const home = await fetchWorker("/");
  if (home.status !== 200) {
    failures.push(`built Worker GET / expected 200, got ${home.status}`);
  } else {
    const body = await home.text();
    if (!body.toLowerCase().includes("<!doctype html>")) {
      failures.push("built Worker GET / did not return the dashboard HTML");
    }
  }

  if (assetMatch) {
    const asset = await fetchWorker(assetMatch[1]);
    if (asset.status !== 200) {
      failures.push(
        `built Worker GET ${assetMatch[1]} expected 200, got ${asset.status}`,
      );
    }
  }

  for (const path of [
    "/api/status",
    "/api/auth/ws-ticket",
    "/api/ws",
    "/api/audio/speak",
    "/api/audio/transcribe",
    "/api/audio/speak-stream",
    "/chat",
  ]) {
    const response = await fetchWorker(path);
    if (response.status !== 404) {
      failures.push(
        `built Worker must not implement ${path}; got HTTP ${response.status}`,
      );
    }
  }

  for (const path of ["/api/ws", "/api/audio/speak-stream"]) {
    const upgrade = await fetchWorker(path, {
      headers: { Upgrade: "websocket" },
    });
    if (upgrade.status !== 404) {
      failures.push(
        `built Worker must not handle Upgrade ${path}; got HTTP ${upgrade.status}`,
      );
    }
  }

  console.log(`dist_worker_sha256=${workerHash}`);
}

if (failures.length) {
  console.error("Production verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Verified ${production.length} intended assets, honesty/recovery strings, and Worker route allowlist.`,
);
