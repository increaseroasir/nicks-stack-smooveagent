(() => {
  const marks = Object.create(null);
  const record = (key, value) => {
    marks[key] = value;
    window.__LIL_PERF__ = marks;
    if (typeof value === "number") {
      console.debug("[lil-perf]", key, `${Math.round(value)}ms`);
    }
  };

  const stampNav = () => {
    const nav = performance.getEntriesByType("navigation")[0];
    if (!nav) return;
    record("nav_to_dcl_ms", nav.domContentLoadedEventEnd);
    record("nav_to_interactive_ms", nav.domInteractive);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", stampNav, { once: true });
  } else {
    stampNav();
  }
  addEventListener("load", stampNav, { once: true });

  const origFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input && input.url ? input.url : "";
    if (!url.includes("/api/auth/ws-ticket")) return origFetch(input, init);
    const started = performance.now();
    try {
      const response = await origFetch(input, init);
      record("ws_ticket_ms", performance.now() - started);
      return response;
    } catch (error) {
      record("ws_ticket_ms", performance.now() - started);
      throw error;
    }
  };

  const OrigWS = window.WebSocket;
  function PatchedWebSocket(url, protocols) {
    const socket = protocols === undefined ? new OrigWS(url) : new OrigWS(url, protocols);
    const href = String(url);
    if (href.includes("/api/ws")) {
      let openedAt = 0;
      socket.addEventListener("open", () => {
        openedAt = performance.now();
      });
      const origSend = socket.send.bind(socket);
      socket.send = (data) => {
        if (typeof data === "string" && data.includes("prompt.submit")) {
          marks.prompt_submit_at = performance.now();
          marks.first_delta_at = 0;
          marks.first_tts_at = 0;
        }
        return origSend(data);
      };
      socket.addEventListener("message", (event) => {
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        const type = payload && payload.params ? payload.params.type : "";
        if (type === "gateway.ready" && openedAt) {
          record("ws_open_to_gateway_ready_ms", performance.now() - openedAt);
        }
        if (type === "message.delta" && !marks.first_delta_at) {
          marks.first_delta_at = performance.now();
          if (marks.prompt_submit_at) {
            record(
              "prompt_to_first_delta_ms",
              marks.first_delta_at - marks.prompt_submit_at,
            );
          }
        }
        if (type === "message.complete" && marks.first_delta_at) {
          record(
            "first_delta_to_complete_ms",
            performance.now() - marks.first_delta_at,
          );
        }
      });
    }
    if (href.includes("/api/audio/speak-stream")) {
      socket.addEventListener("message", (event) => {
        if (
          event.data instanceof ArrayBuffer &&
          event.data.byteLength > 0 &&
          marks.first_delta_at &&
          !marks.first_tts_at
        ) {
          marks.first_tts_at = performance.now();
          record(
            "first_delta_to_first_tts_ms",
            marks.first_tts_at - marks.first_delta_at,
          );
        }
      });
    }
    return socket;
  }
  PatchedWebSocket.prototype = OrigWS.prototype;
  PatchedWebSocket.CONNECTING = OrigWS.CONNECTING;
  PatchedWebSocket.OPEN = OrigWS.OPEN;
  PatchedWebSocket.CLOSING = OrigWS.CLOSING;
  PatchedWebSocket.CLOSED = OrigWS.CLOSED;
  window.WebSocket = PatchedWebSocket;

  const origPlay = HTMLAudioElement.prototype.play;
  HTMLAudioElement.prototype.play = function play() {
    if (marks.first_delta_at && !marks.first_tts_at) {
      marks.first_tts_at = performance.now();
      record(
        "first_delta_to_first_tts_ms",
        marks.first_tts_at - marks.first_delta_at,
      );
    }
    return origPlay.call(this);
  };

  if (typeof PerformanceObserver === "function") {
    const longTasks = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTasks.push(Math.round(entry.duration));
      }
      if (longTasks.length) {
        record("long_task_count", longTasks.length);
        record("long_task_worst_ms", Math.max(...longTasks));
      }
    });
    try {
      observer.observe({ type: "longtask", buffered: true });
    } catch {
      /* Safari */
    }
  }
})();
