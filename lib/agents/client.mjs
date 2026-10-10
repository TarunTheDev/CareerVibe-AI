// lib/agents/client.mjs
// Thin wrapper over the existing /api/chat proxy, plus a strict "ask for JSON"
// helper with validation + retry. The network caller is injectable so the
// parse/validate/retry logic is unit-testable with zero AI and zero network.

import { extractJson } from "./json.mjs";
import { SOURCE } from "./types.mjs";

/**
 * Call the /api/chat proxy. Returns "" on ANY failure (matching the route's
 * never-500 contract) so callers fall back deterministically.
 */
export async function callChat(prompt, maxTokens = 900) {
  if (typeof fetch !== "function") return "";
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, maxTokens }),
    });
    if (!res.ok) return "";
    const json = await res.json().catch(() => ({}));
    return typeof json?.text === "string" ? json.text : "";
  } catch {
    return "";
  }
}

/**
 * Ask the model for JSON, parse it strictly, validate/normalize it, and retry
 * on failure. NEVER throws. Returns { data, source, attempts, text }.
 *
 * @param {object}   opts
 * @param {string}   opts.prompt
 * @param {number}  [opts.maxTokens=900]
 * @param {number}  [opts.retries=1]      extra attempts after the first
 * @param {(raw:any)=>any} [opts.validate] return null/undefined to reject & retry
 * @param {(p:string,n:number)=>Promise<string>} [opts.caller=callChat] injectable
 */
export async function askJSON({
  prompt,
  maxTokens = 900,
  retries = 1,
  validate,
  caller = callChat,
}) {
  const attempts = Math.max(1, retries + 1);
  let lastText = "";
  for (let i = 0; i < attempts; i++) {
    const text = await caller(prompt, maxTokens);
    if (typeof text === "string" && text.trim()) lastText = text;
    const raw = extractJson(text);
    if (raw != null) {
      const data = validate ? validate(raw) : raw;
      if (data != null) {
        return { data, source: SOURCE.MODEL, attempts: i + 1, text };
      }
    }
  }
  return { data: null, source: SOURCE.MODEL, attempts, text: lastText };
}
