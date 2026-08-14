const TOKENS = 400;
const WINDOW = 36;

function oldUpdate(lines, id, token) {
  if (id) return lines.map((line) => (line.id === id ? { ...line, body: line.body + token } : line));
  return [...lines, { id: "live", speaker: "LIL SMOOVE", body: token }];
}

function newUpdate(lines, id, token) {
  if (id) {
    const last = lines.length - 1;
    if (last >= 0 && lines[last].id === id) {
      const next = lines.slice();
      next[last] = { ...lines[last], body: lines[last].body + token };
      return next;
    }
  }
  return [...lines, { id: "live", speaker: "LIL SMOOVE", body: token }];
}

function bench(label, update, flushEvery) {
  let lines = Array.from({ length: 80 }, (_, i) => ({
    id: `seed-${i}`,
    speaker: "SYSTEM",
    body: "seed",
  }));
  let id = null;
  const started = performance.now();
  let flushes = 0;
  let pending = "";
  for (let i = 0; i < TOKENS; i += 1) {
    pending += "x";
    if ((i + 1) % flushEvery !== 0 && i !== TOKENS - 1) continue;
    const token = pending;
    pending = "";
    if (!id) {
      lines = update(lines, null, token);
      id = "live";
    } else {
      lines = update(lines, id, token);
    }
    const shown = lines.length > WINDOW ? lines.slice(-WINDOW) : lines;
    flushes += 1;
    void shown.length;
  }
  return { label, ms: performance.now() - started, flushes, lines: lines.length };
}

const baseline = bench("per-token-full-map", oldUpdate, 1);
const after = bench("40ms-last-item-window", newUpdate, 8);
console.log(JSON.stringify({ baseline, after }, null, 2));
