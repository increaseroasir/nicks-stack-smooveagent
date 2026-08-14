import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  deriveLilSmooveLiveState,
  lilSmooveLiveMarkup,
  toolDisplayName,
} from "./lil-smoove-live-state.mjs";

describe("event/state-to-animation mapping", () => {
  const cases = [
    [{ channel: "offline", voice: "idle" }, "disconnected"],
    [{ channel: "connecting", voice: "offline" }, "connecting"],
    [{ channel: "live", voice: "idle" }, "ready"],
    [{ channel: "live", voice: "offline" }, "ready"],
    [{ channel: "live", voice: "listening" }, "listening"],
    [{ channel: "live", voice: "transcribing" }, "listening"],
    [{ channel: "live", voice: "thinking" }, "thinking"],
    [{ channel: "live", voice: "working", toolName: "browser" }, "tool"],
    [{ channel: "live", voice: "speaking" }, "speaking"],
    [{ channel: "live", voice: "approval" }, "approval"],
    [{ channel: "live", voice: "interrupted" }, "interrupted"],
  ];
  for (const [input, expected] of cases) {
    it(`${input.channel}/${input.voice} -> ${expected}`, () => {
      assert.equal(deriveLilSmooveLiveState(input).id, expected);
    });
  }
});

describe("state priority", () => {
  it("disconnected beats approval, tools, and speech", () => {
    assert.equal(
      deriveLilSmooveLiveState({
        channel: "offline",
        voice: "approval",
        toolName: "shell",
      }).id,
      "disconnected",
    );
  });
  it("approval beats listening, tools, and speech", () => {
    assert.equal(
      deriveLilSmooveLiveState({
        channel: "live",
        voice: "approval",
        toolName: "shell",
      }).id,
      "approval",
    );
  });
  it("listening beats tool and speaking", () => {
    assert.equal(
      deriveLilSmooveLiveState({
        channel: "live",
        voice: "listening",
        toolName: "shell",
      }).id,
      "listening",
    );
  });
  it("tool beats speaking and thinking", () => {
    assert.equal(
      deriveLilSmooveLiveState({
        channel: "live",
        voice: "working",
        toolName: "shell",
      }).id,
      "tool",
    );
  });
  it("speaking beats thinking", () => {
    assert.equal(
      deriveLilSmooveLiveState({ channel: "live", voice: "speaking" }).id,
      "speaking",
    );
  });
  it("live channel with leftover offline voice is ready, not connecting", () => {
    assert.equal(
      deriveLilSmooveLiveState({ channel: "live", voice: "offline" }).id,
      "ready",
    );
  });
});

describe("tool name rendering", () => {
  it("exposes the real active tool name while working", () => {
    const state = deriveLilSmooveLiveState({
      channel: "live",
      voice: "working",
      toolName: "web_search",
    });
    assert.equal(state.toolName, "web_search");
    assert.match(lilSmooveLiveMarkup(state), /web_search/);
  });
  it("hides the idle placeholder", () => {
    assert.equal(toolDisplayName("No tool in motion"), null);
    const state = deriveLilSmooveLiveState({
      channel: "live",
      voice: "working",
      toolName: "No tool in motion",
    });
    assert.equal(state.toolName, null);
    assert.doesNotMatch(lilSmooveLiveMarkup(state), /No tool in motion/);
  });
  it("does not show a tool name outside the working state", () => {
    const state = deriveLilSmooveLiveState({
      channel: "live",
      voice: "thinking",
      toolName: "web_search",
    });
    assert.equal(state.toolName, null);
  });
});

describe("approval state", () => {
  it("labels approval and keeps optional detail", () => {
    const state = deriveLilSmooveLiveState({
      channel: "live",
      voice: "approval",
      approvalDetail: "Confirm send",
    });
    assert.equal(state.id, "approval");
    assert.equal(state.approval, true);
    assert.equal(state.approvalDetail, "Confirm send");
    assert.equal(state.label, "APPROVAL REQUIRED");
    assert.match(lilSmooveLiveMarkup(state), /APPROVAL REQUIRED/);
  });
});

describe("disconnect/reconnect", () => {
  it("maps a closed socket to disconnected", () => {
    assert.equal(
      deriveLilSmooveLiveState({ channel: "offline", voice: "speaking" }).id,
      "disconnected",
    );
  });
  it("returns to connecting, then ready after live", () => {
    assert.equal(
      deriveLilSmooveLiveState({ channel: "connecting", voice: "offline" }).id,
      "connecting",
    );
    assert.equal(
      deriveLilSmooveLiveState({ channel: "live", voice: "idle" }).id,
      "ready",
    );
  });
});

describe("missing optional event data", () => {
  it("tolerates empty input", () => {
    const state = deriveLilSmooveLiveState();
    assert.equal(state.id, "connecting");
    assert.equal(state.toolName, null);
    assert.equal(state.approvalDetail, null);
  });
  it("tolerates blank tool and approval strings", () => {
    const state = deriveLilSmooveLiveState({
      channel: "live",
      voice: "working",
      toolName: "   ",
      approvalDetail: "",
    });
    assert.equal(state.toolName, null);
    assert.doesNotMatch(lilSmooveLiveMarkup(state), /undefined|null/);
  });
  it("escapes tool names in markup", () => {
    const state = deriveLilSmooveLiveState({
      channel: "live",
      voice: "working",
      toolName: `<img src=x onerror=alert(1)>`,
    });
    assert.doesNotMatch(lilSmooveLiveMarkup(state), /<img/);
    assert.match(lilSmooveLiveMarkup(state), /&lt;img/);
  });
});

describe("reduced-motion stylesheet", () => {
  it("pauses office motion when the user prefers reduced motion", async () => {
    const css = await readFile(
      resolve(import.meta.dirname, "../public/ui/lil-smoove-live.css"),
      "utf8",
    );
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    assert.match(css, /animation: none/);
  });
});
