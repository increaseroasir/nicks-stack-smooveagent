const IDLE_TOOL = "No tool in motion";

export const LIL_SMOOVE_LIVE_STATES = [
  "disconnected",
  "approval",
  "interrupted",
  "listening",
  "tool",
  "speaking",
  "thinking",
  "ready",
  "connecting",
];

const LABELS = {
  disconnected: "OFFLINE",
  approval: "APPROVAL REQUIRED",
  interrupted: "INTERRUPTED",
  listening: "LISTENING",
  tool: "WORKING",
  speaking: "SPEAKING",
  thinking: "THINKING",
  ready: "READY",
  connecting: "CONNECTING",
};

const LIGHTS = {
  disconnected: "red",
  approval: "red",
  interrupted: "amber",
  listening: "lime",
  tool: "lime",
  speaking: "lime",
  thinking: "lime",
  ready: "lime",
  connecting: "amber",
};

function textOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

export function toolDisplayName(toolName) {
  const text = textOrNull(toolName);
  if (!text || text === IDLE_TOOL) return null;
  return text;
}

export function deriveLilSmooveLiveState(input = {}) {
  const channel = textOrNull(input.channel) || "connecting";
  const voice = textOrNull(input.voice) || "offline";
  const toolName = toolDisplayName(input.toolName);
  const approvalDetail = textOrNull(input.approvalDetail);

  let id;
  if (channel === "offline") id = "disconnected";
  else if (voice === "approval") id = "approval";
  else if (voice === "interrupted") id = "interrupted";
  else if (voice === "listening" || voice === "transcribing") id = "listening";
  else if (voice === "working") id = "tool";
  else if (voice === "speaking") id = "speaking";
  else if (voice === "thinking") id = "thinking";
  else if (channel === "live") id = "ready";
  else id = "connecting";

  return {
    id,
    label: LABELS[id],
    light: LIGHTS[id],
    toolName: id === "tool" ? toolName : null,
    approval: id === "approval",
    approvalDetail: id === "approval" ? approvalDetail : null,
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export function lilSmooveLiveMarkup(state) {
  const tool = state.toolName ? escapeHtml(state.toolName) : "";
  return `<header class="ls-live__head"><span>LIL SMOOVE LIVE</span><b data-light="${escapeHtml(state.light)}">${escapeHtml(state.label)}</b></header>
<div class="ls-live__stage" aria-hidden="true">
<svg class="ls-live__scene" viewBox="0 0 220 118" xmlns="http://www.w3.org/2000/svg">
<rect class="ls-live__room" x="1" y="1" width="218" height="116" rx="4"/>
<path class="ls-live__grid" d="M12 88H208M12 96H208M12 104H208M40 80V110M80 80V110M120 80V110M160 80V110"/>
<rect class="ls-live__desk" x="28" y="78" width="164" height="8"/>
<rect class="ls-live__desk-leg" x="36" y="86" width="4" height="18"/>
<rect class="ls-live__desk-leg" x="180" y="86" width="4" height="18"/>
<rect class="ls-live__chair" x="86" y="70" width="28" height="6"/>
<rect class="ls-live__chair-back" x="110" y="48" width="6" height="28"/>
<g class="ls-live__body">
<rect class="ls-live__hair" x="91" y="31" width="14" height="5"/>
<rect class="ls-live__head" x="92" y="34" width="12" height="12"/>
<rect class="ls-live__eye" x="95" y="38" width="2" height="2"/>
<rect class="ls-live__eye" x="99" y="38" width="2" height="2"/>
<rect class="ls-live__torso" x="90" y="46" width="16" height="18"/>
<rect class="ls-live__arm ls-live__arm--l" x="82" y="48" width="8" height="4"/>
<rect class="ls-live__arm ls-live__arm--r" x="106" y="48" width="10" height="4"/>
<rect class="ls-live__headset" x="90" y="36" width="16" height="3"/>
</g>
<g class="ls-live__terminal">
<rect class="ls-live__bezel" x="138" y="38" width="46" height="32"/>
<rect class="ls-live__screen" x="142" y="42" width="38" height="22"/>
<rect class="ls-live__cursor" x="148" y="50" width="6" height="8"/>
<rect class="ls-live__stand" x="156" y="70" width="10" height="8"/>
</g>
<circle class="ls-live__lamp" cx="48" cy="74" r="4"/>
<g class="ls-live__in-waves"><path d="M64 44c6-6 6-14 0-20"/><path d="M70 46c9-8 9-20 0-28"/></g>
<g class="ls-live__out-waves"><path d="M190 44c6-6 6-14 0-20"/><path d="M196 46c9-8 9-20 0-28"/></g>
<g class="ls-live__alert"><rect x="58" y="14" width="104" height="16" rx="2"/><text x="110" y="25">APPROVAL REQUIRED</text></g>
</svg>
</div>
<footer class="ls-live__foot">${
    state.id === "tool" && tool
      ? `<span>TOOL</span><strong>${tool}</strong>`
      : state.approval
        ? `<span>AUTHORITY</span><strong>APPROVAL REQUIRED</strong>`
        : `<span>CHANNEL</span><strong>${escapeHtml(state.label)}</strong>`
  }</footer>`;
}
