/**
 * Executes untrusted, AI-generated test code inside a Web Worker.
 *
 * A Web Worker runs in an isolated global scope with NO access to the parent
 * page's `document`, `window`, cookies, or `localStorage`. This technically
 * enforces isolation of AI-generated scripts instead of relying on the AI
 * being instructed to avoid sensitive APIs. Combined with a hard timeout and
 * worker termination, prompt-injected code cannot exfiltrate cookies/session
 * data from the host page.
 */

const WORKER_SOURCE = `
self.onmessage = async (e) => {
  const { setup, code } = e.data;
  // Best-effort: deny network access from inside the sandbox.
  try { self.fetch = undefined; } catch (_) {}
  try { self.XMLHttpRequest = undefined; } catch (_) {}
  try { self.importScripts = undefined; } catch (_) {}
  try { self.WebSocket = undefined; } catch (_) {}
  const body = setup + "\\n;return (async () => {\\n" + code + "\\n})();";
  try {
    const fn = new Function(body);
    await fn();
    self.postMessage({ passed: true, error: null });
  } catch (err) {
    self.postMessage({ passed: false, error: err && err.message ? err.message : String(err) });
  }
};
`;

export function runInSandbox(
  setup: string,
  code: string,
  timeoutMs = 3000,
): Promise<{ passed: boolean; error: string | null }> {
  return new Promise((resolve) => {
    if (typeof Worker === "undefined") {
      resolve({ passed: false, error: "Sandboxed execution is not available in this environment." });
      return;
    }

    let url: string | null = null;
    let worker: Worker | null = null;
    let settled = false;

    const cleanup = () => {
      if (worker) worker.terminate();
      if (url) URL.revokeObjectURL(url);
    };

    const finish = (result: { passed: boolean; error: string | null }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({ passed: false, error: "Test timed out" });
    }, timeoutMs);

    try {
      const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
      url = URL.createObjectURL(blob);
      worker = new Worker(url);
      worker.onmessage = (ev: MessageEvent) => finish(ev.data);
      worker.onerror = (ev: ErrorEvent) =>
        finish({ passed: false, error: ev.message || "Sandbox execution error" });
      worker.postMessage({ setup, code });
    } catch (e) {
      finish({ passed: false, error: e instanceof Error ? e.message : String(e) });
    }
  });
}