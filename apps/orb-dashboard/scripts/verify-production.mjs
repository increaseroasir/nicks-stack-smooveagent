import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const failures = [];

const html = await readFile(joinHtml(), "utf8");
const worker = await readFile(resolve(ROOT, "src/worker-template.js"), "utf8");
const wrangler = await readFile(resolve(ROOT, "wrangler.jsonc"), "utf8");
const bundle = await readFile(
  resolve(ROOT, "public/ui/assets/index-DrSg8VbT.js"),
  "utf8",
);

function joinHtml() {
  return resolve(ROOT, "public/index.html");
}

if (html.includes("manus-runtime") || html.includes("manus-analytics")) {
  failures.push("index.html still includes Manus runtime or analytics");
}
if (html.includes("__MANUS_HOST_DEV__")) {
  failures.push("index.html still includes Manus host flag");
}
if (Buffer.byteLength(html) > 4096) {
  failures.push(`index.html is ${Buffer.byteLength(html)} bytes; expected a thin shell`);
}
if (!html.includes("/ui/perf.js") || !html.includes("/ui/assets/index-DrSg8VbT.js")) {
  failures.push("index.html missing perf or application bundle");
}

for (const forbidden of [
  "__ASSET_MAP__",
  "atob(",
  "DecompressionStream",
  'url.pathname.startsWith("/api/")',
  'url.pathname === "/chat"',
  'request.headers.get("upgrade")',
]) {
  if (worker.includes(forbidden)) {
    failures.push(`worker-template.js unexpectedly contains ${forbidden}`);
  }
}
if (!worker.includes("env.ASSETS.fetch")) {
  failures.push("worker-template.js does not serve / via ASSETS");
}
if (!wrangler.includes('"directory": "./public"')) {
  failures.push("wrangler.jsonc is not using Cloudflare static assets");
}
if (!wrangler.includes('"run_worker_first": true')) {
  failures.push("wrangler.jsonc must run the Worker first so /api and /chat stay unhandled");
}

if (bundle.includes("Qe.map(yn=>yn.id===nt")) {
  failures.push("bundle still maps the full transcript on every delta");
}
if (!bundle.includes("TranscriptView") || !bundle.includes("pushDelta")) {
  failures.push("bundle is missing buffered transcript updates");
}
if (bundle.includes("`${q.speaker}-${te}-${q.body}`")) {
  failures.push("bundle still remounts transcript lines from body text");
}
if (bundle.includes("__MANUS_HOST_DEV__") || bundle.includes("manus-analytics")) {
  failures.push("application bundle still references Manus");
}

if (failures.length) {
  console.error("Frontend integrity verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Verified slim shell, static assets Worker, and buffered transcript.");
